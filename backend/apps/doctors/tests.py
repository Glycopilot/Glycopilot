"""
Tests : création compte patient, invitations, admin valide le docteur,
docteur non validé = indisponible pour le patient, docteur validé peut ajouter un patient.
"""
from datetime import timedelta
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

import requests
from rest_framework import status
from rest_framework.test import APIClient

from apps.activities.models import Activity, UserActivity
from apps.alerts.models import AlertEvent, AlertRule, AlertSeverity, UserAlertRule
from apps.doctors.models import (
    DoctorProfile,
    InvitationStatus,
    PatientCareTeam,
    VerificationStatus,
)
from apps.doctors.services.patient_data_service import DoctorPatientDataService
from apps.doctors.services.verification import DoctorVerificationService
from apps.glycemia.models import Glycemia, GlycemiaHisto
from apps.meals.models import Meal, UserMeal
from apps.medications.models import Medication, UserMedication
from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()


class CareTeamIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient_role, _ = Role.objects.get_or_create(name="PATIENT")
        self.doctor_role, _ = Role.objects.get_or_create(name="DOCTOR")
        Role.objects.get_or_create(name="FAMILY")
        Role.objects.get_or_create(name="SUPERADMIN")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")
        self.verified_status, _ = VerificationStatus.objects.get_or_create(
            label="VERIFIED"
        )
        self.pending_status, _ = VerificationStatus.objects.get_or_create(
            label="PENDING"
        )

    def _make_patient(self, email="patient@test.com", password="pass123"):
        identity = UserIdentity.objects.create(
            first_name="Patient", last_name="User", phone_number="0600000000"
        )
        User.objects.create_user(email=email, password=password, user_identity=identity)
        profile = Profile.objects.create(user=identity, role=self.patient_role)
        return identity, profile

    def _make_doctor(self, email="doctor@test.com", password="pass123", verified=True):
        identity = UserIdentity.objects.create(
            first_name="Doctor", last_name="User", phone_number="0611111111"
        )
        User.objects.create_user(email=email, password=password, user_identity=identity)
        profile = Profile.objects.create(user=identity, role=self.doctor_role)
        doc_profile = profile.doctor_profile
        doc_profile.verification_status = (
            self.verified_status if verified else self.pending_status
        )
        doc_profile.license_number = "LIC-TEST"
        doc_profile.save()
        return identity, profile

    def test_patient_register_creates_account(self):
        """Création d'un compte patient via l'API register."""
        data = {
            "email": "patient_care@test.com",
            "password": "Password123!",
            "password_confirm": "Password123!",
            "first_name": "Jean",
            "last_name": "Patient",
            "role": "PATIENT",
        }
        response = self.client.post("/api/auth/register/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertTrue(User.objects.filter(email="patient_care@test.com").exists())

    def test_patient_invite_unverified_doctor_returns_not_available(self):
        """Le patient ne peut pas inviter un docteur non validé : compte indisponible / inexistant."""
        # Créer patient (manuellement pour avoir PatientProfile via signal)
        patient_identity, p_profile = self._make_patient(
            email="paul@test.com", password="pass123"
        )
        self.assertTrue(hasattr(p_profile, "patient_profile"))

        # Créer docteur NON vérifié (PENDING)
        _, doc_profile = self._make_doctor(
            email="doc_unverified@test.com", password="pass123", verified=False
        )

        # Patient invite le docteur -> doit échouer (docteur non disponible)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc_unverified@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("n'existe pas", response.data["error"])
        self.assertFalse(
            PatientCareTeam.objects.filter(
                patient_profile=p_profile.patient_profile, member_profile=doc_profile
            ).exists()
        )

    def test_admin_validates_doctor_then_patient_can_invite(self):
        """Admin valide le compte docteur, puis le patient peut inviter le docteur."""
        # Patient
        patient_identity, _ = self._make_patient(
            email="alice@test.com", password="pass123"
        )

        # Docteur PENDING
        _, doc_profile = self._make_doctor(
            email="bob_doctor@test.com", password="pass123", verified=False
        )
        doc_prof = doc_profile.doctor_profile

        # Admin (superadmin)
        admin_identity = UserIdentity.objects.create(
            first_name="Admin", last_name="Super"
        )
        admin_account = User.objects.create_user(
            email="admin@test.com", password="admin123", user_identity=admin_identity
        )
        admin_account.is_staff = True
        admin_account.is_superuser = True
        admin_account.save()
        admin_role = Role.objects.get(name="SUPERADMIN")
        Profile.objects.create(user=admin_identity, role=admin_role)

        # Admin valide le docteur
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('admin@test.com', 'admin123')}"
        )
        response = self.client.post(
            f"/api/doctors/verification/{doc_prof.doctor_id}/accept/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        doc_prof.refresh_from_db()
        self.assertEqual(doc_prof.verification_status.label, "VERIFIED")

        # Patient invite le docteur -> succès
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('alice@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "bob_doctor@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)

    def test_unverified_doctor_cannot_add_patient(self):
        """Un docteur non validé ne peut pas ajouter de patient."""
        self._make_doctor(email="unv_doc@test.com", password="pass123", verified=False)

        self._make_patient(email="pat_two@test.com", password="pass123")

        response = self.client.post(
            "/api/auth/login/", {"email": "unv_doc@test.com", "password": "pass123"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)

    def test_verified_doctor_can_add_patient(self):
        """Après validation par l'admin, le docteur peut ajouter un patient."""
        self._make_doctor(
            email="verified_doc@test.com", password="pass123", verified=True
        )

        self._make_patient(email="newpat@test.com", password="pass123")

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('verified_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "newpat@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)

    def test_full_flow_patient_invitations_and_doctor_add_patient(self):
        """Scénario complet : patient créé, invitations (famille), admin valide docteur, patient invite docteur, docteur ajoute un autre patient."""
        # 1. Créer compte patient
        patient_identity, p_profile = self._make_patient(
            email="full_patient@test.com", password="pass123"
        )
        patient_profile = p_profile.patient_profile

        # 2. Patient ajoute un membre famille
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('full_patient@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {
                "first_name": "Marie",
                "last_name": "Famille",
                "role": "FAMILY",
                "relation_type": "Épouse",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 3. Docteur PENDING
        _, doc_profile = self._make_doctor(
            email="full_doc@test.com", password="pass123", verified=False
        )
        doc_prof = doc_profile.doctor_profile

        # 4. Patient ne peut pas encore inviter le docteur
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "full_doc@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Admin valide le docteur
        admin_identity = UserIdentity.objects.create(
            first_name="Super", last_name="Admin"
        )
        admin_account = User.objects.create_user(
            email="super@test.com", password="admin123", user_identity=admin_identity
        )
        admin_account.is_staff = True
        admin_account.is_superuser = True
        admin_account.save()
        Profile.objects.create(
            user=admin_identity, role=Role.objects.get(name="SUPERADMIN")
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('super@test.com', 'admin123')}"
        )
        response = self.client.post(
            f"/api/doctors/verification/{doc_prof.doctor_id}/accept/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 6. Patient invite le docteur
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('full_patient@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "full_doc@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            PatientCareTeam.objects.filter(
                patient_profile=patient_profile, member_profile=doc_profile
            ).exists()
        )

        # 7. Docteur ajoute un autre patient (deuxième patient)
        self._make_patient(email="second_patient@test.com", password="pass123")

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('full_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "second_patient@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 8. Docteur voit son équipe (my-team)
        response = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("active_patients", response.data)
        self.assertIn("pending_invites", response.data)

    def test_add_family_member_validation_and_role_check(self):
        self._make_patient(email="fam_patient@test.com", password="pass123")
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('fam_patient@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {"first_name": "Marie", "last_name": "Test", "role": "INVALID"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {"first_name": "Marie", "last_name": "Test", "role": "FAMILY"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_invite_doctor_invalid_role_or_self_invite(self):
        self._make_patient(email="self@test.com", password="pass123")
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('self@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "self@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc@test.com", "role": "INVALID"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accept_invitation_requires_invited_user(self):
        patient_identity, p_profile = self._make_patient(
            email="inv_patient@test.com", password="pass123"
        )
        _, doc_profile = self._make_doctor(
            email="inv_doc@test.com", password="pass123", verified=True
        )
        pending_status = InvitationStatus.objects.get(label="PENDING")
        invitation = PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=pending_status,
        )
        other_identity = UserIdentity.objects.create(
            first_name="Other", last_name="User", phone_number="0700000000"
        )
        User.objects.create_user(
            email="other@test.com", password="pass123", user_identity=other_identity
        )
        Profile.objects.create(user=other_identity, role=self.patient_role)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('other@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/accept-invitation/",
            {"id_team_member": str(invitation.id_team_member)},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_accept_invitation_success(self):
        patient_identity, p_profile = self._make_patient(
            email="accept_patient@test.com", password="pass123"
        )
        _, doc_profile = self._make_doctor(
            email="accept_doc@test.com", password="pass123", verified=True
        )
        pending_status = InvitationStatus.objects.get(label="PENDING")
        invitation = PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=pending_status,
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('accept_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/accept-invitation/",
            {"id_team_member": str(invitation.id_team_member)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status.label, "ACTIVE")

    def test_add_patient_validation_and_not_found(self):
        self._make_doctor(email="doc_add@test.com", password="pass123", verified=True)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc_add@test.com', 'pass123')}"
        )
        response = self.client.post("/api/doctors/care-team/add-patient/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "missing@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_verification_accept_invalid_uuid(self):
        admin_identity = UserIdentity.objects.create(
            first_name="Admin", last_name="User"
        )
        admin_account = User.objects.create_user(
            email="admin2@test.com", password="admin123", user_identity=admin_identity
        )
        admin_account.is_staff = True
        admin_account.is_superuser = True
        admin_account.save()
        Profile.objects.create(
            user=admin_identity, role=Role.objects.get(name="SUPERADMIN")
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('admin2@test.com', 'admin123')}"
        )
        response = self.client.post("/api/doctors/verification/invalid/accept/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def _token_for(self, email, password):
        """Retourne le token d'accès pour email/password."""
        r = self.client.post("/api/auth/login/", {"email": email, "password": password})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        return r.data["access"]


class DoctorVerificationServiceTests(TestCase):
    @override_settings(LICENCE_VERIFICATION_API=None)
    def test_verify_license_no_api_configured(self):
        self.assertFalse(DoctorVerificationService.verify_license("12345"))

    @override_settings(LICENCE_VERIFICATION_API="https://example.test/Practitioner")
    def test_verify_license_missing_license(self):
        self.assertFalse(DoctorVerificationService.verify_license(""))

    @override_settings(LICENCE_VERIFICATION_API="https://example.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_valid_bundle(self, mock_get):
        mock_get.return_value = Mock(
            status_code=200,
            json=Mock(
                return_value={
                    "resourceType": "Bundle",
                    "total": 1,
                    "entry": [{"resource": {}}],
                }
            ),
        )
        self.assertTrue(DoctorVerificationService.verify_license("12345"))

    @override_settings(LICENCE_VERIFICATION_API="https://example.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_non_json_response(self, mock_get):
        mock_response = Mock(status_code=200)
        mock_response.json.side_effect = requests.exceptions.JSONDecodeError(
            "Expecting value", "", 0
        )
        mock_get.return_value = mock_response
        self.assertFalse(DoctorVerificationService.verify_license("12345"))

    @override_settings(LICENCE_VERIFICATION_API="https://example.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_non_200(self, mock_get):
        mock_get.return_value = Mock(status_code=500, json=Mock(return_value={}))
        self.assertFalse(DoctorVerificationService.verify_license("12345"))

    @override_settings(LICENCE_VERIFICATION_API="https://example.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_request_exception(self, mock_get):
        mock_get.side_effect = requests.RequestException("boom")
        self.assertFalse(DoctorVerificationService.verify_license("12345"))


class DoctorPatientDataServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient_data@test.com", password="pass123"
        )

    def test_get_patient_dashboard_with_data(self):
        Glycemia.objects.create(
            user=self.user,
            measured_at=timezone.now() - timedelta(hours=1),
            value=110,
            unit="mg/dL",
            trend="flat",
        )
        rule = AlertRule.objects.create(
            code="HYPO",
            name="Hypo",
            min_glycemia=70,
            max_glycemia=180,
            severity=AlertSeverity.HIGH,
            is_active=True,
        )
        UserAlertRule.objects.create(user=self.user, rule=rule, enabled=True)
        AlertEvent.objects.create(
            user=self.user,
            rule=rule,
            glycemia_value=60,
            status="TRIGGERED",
            inapp_created_at=timezone.now(),
        )
        medication = Medication.objects.create(name="Med", dosage="10mg")
        UserMedication.objects.create(
            user=self.user,
            medication=medication,
            start_date=timezone.now().date(),
            statut=True,
        )
        meal = Meal.objects.create(name="Meal", calories=500, glucose=50)
        UserMeal.objects.create(
            user=self.user, meal=meal, taken_at=timezone.now() - timedelta(hours=2)
        )
        activity = Activity.objects.create(name="Walk")
        UserActivity.objects.create(
            user=self.user,
            activity=activity,
            start=timezone.now() - timedelta(hours=1),
            end=timezone.now(),
        )

        data = DoctorPatientDataService.get_patient_dashboard(self.user)
        self.assertIn("glucose", data)
        self.assertIn("alerts", data)
        self.assertIn("medication", data)
        self.assertIn("nutrition", data)
        self.assertIn("activity", data)
        self.assertIn("healthScore", data)

    def test_get_history_helpers(self):
        GlycemiaHisto.objects.create(
            user=self.user,
            measured_at=timezone.now(),
            value=120,
            unit="mg/dL",
            trend="flat",
            rate=0.0,
            source="manual",
            location_lat=1.0,
            location_lng=2.0,
        )
        history = DoctorPatientDataService.get_glycemia_history(self.user)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["location"], {"lat": 1.0, "lng": 2.0})

        meal = Meal.objects.create(name="Meal", calories=500, glucose=50)
        UserMeal.objects.create(
            user=self.user, meal=meal, taken_at=timezone.now() - timedelta(hours=2)
        )
        meals = DoctorPatientDataService.get_meals_history(self.user)
        self.assertEqual(len(meals), 1)

        medication = Medication.objects.create(name="Med", dosage="10mg")
        UserMedication.objects.create(
            user=self.user,
            medication=medication,
            start_date=timezone.now().date(),
            taken_at=timezone.now() - timedelta(hours=1),
            statut=True,
        )
        meds = DoctorPatientDataService.get_medications_history(self.user)
        self.assertEqual(len(meds), 1)
