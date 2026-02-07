"""
Tests : création compte patient, invitations, admin valide le docteur,
docteur non validé = indisponible pour le patient, docteur validé peut ajouter un patient.
"""
import uuid
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import TestCase, override_settings
from django.utils import timezone

import requests
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

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
        doc_profile.license_number = f"LIC-{uuid.uuid4().hex[:8]}"
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

    def test_verification_decline_and_already_verified(self):
        _, doc_profile = self._make_doctor(
            email="decline_doc@test.com", password="pass123", verified=False
        )
        doc_prof = doc_profile.doctor_profile
        admin_identity = UserIdentity.objects.create(
            first_name="Admin2", last_name="User"
        )
        admin_account = User.objects.create_user(
            email="admin_decline@test.com",
            password="admin123",
            user_identity=admin_identity,
        )
        admin_account.is_staff = True
        admin_account.is_superuser = True
        admin_account.save()
        Profile.objects.create(
            user=admin_identity, role=Role.objects.get(name="SUPERADMIN")
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('admin_decline@test.com', 'admin123')}"
        )
        response = self.client.post(
            f"/api/doctors/verification/{doc_prof.doctor_id}/decline/",
            {"rejection_reason": "missing docs"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Accept after decline should succeed
        response = self.client.post(
            f"/api/doctors/verification/{doc_prof.doctor_id}/accept/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Accept again should return already validated
        response = self.client.post(
            f"/api/doctors/verification/{doc_prof.doctor_id}/accept/"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_access_invalid_patient_id(self):
        _, doc_profile = self._make_doctor(
            email="access_doc@test.com", password="pass123", verified=True
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('access_doc@test.com', 'pass123')}"
        )
        response = self.client.get(
            "/api/doctors/care-team/patient-dashboard/?patient_user_id=bad-id"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_associations_view(self):
        patient_identity, p_profile = self._make_patient(
            email="assoc_patient@test.com", password="pass123"
        )
        _, doc_profile = self._make_doctor(
            email="assoc_doc@test.com", password="pass123", verified=True
        )
        active_status = InvitationStatus.objects.get(label="ACTIVE")
        PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=active_status,
        )
        from apps.doctors.views.associations_views import DoctorAssociationsView

        factory = APIRequestFactory()
        request = factory.get("/api/doctors/associations/")
        doctor_account = User.objects.get(email="assoc_doc@test.com")
        force_authenticate(request, user=doctor_account)
        response = DoctorAssociationsView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("patients_par_medecin", response.data)
        self.assertIn("medecins_avec_patients", response.data)

    def test_doctor_associations_view_no_status(self):
        InvitationStatus.objects.all().delete()
        from apps.doctors.views.associations_views import DoctorAssociationsView

        request = APIRequestFactory().get("/api/doctors/associations/")
        self._make_doctor(
            email="assoc_doc2@test.com", password="pass123", verified=True
        )
        force_authenticate(request, user=User.objects.get(email="assoc_doc2@test.com"))
        response = DoctorAssociationsView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_add_family_member_errors(self):
        # Non-patient role
        self._make_doctor(
            email="family_doc@test.com", password="pass123", verified=True
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('family_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {"first_name": "Marie", "last_name": "Test", "role": "FAMILY"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Patient profile missing
        patient_identity, patient_profile = self._make_patient(
            email="family_missing@test.com", password="pass123"
        )
        patient_profile.patient_profile.delete()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('family_missing@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {"first_name": "Marie", "last_name": "Test", "role": "FAMILY"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing last name with valid patient profile
        self._make_patient(email="family_valid@test.com", password="pass123")
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('family_valid@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {"first_name": "Marie", "role": "FAMILY"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invite_doctor_error_cases(self):
        self._make_patient(email="inv_err@test.com", password="pass123")
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('inv_err@test.com', 'pass123')}"
        )
        response = self.client.post("/api/doctors/care-team/invite-doctor/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Patient profile missing
        identity, profile = self._make_patient(
            email="inv_missing@test.com", password="pass123"
        )
        profile.patient_profile.delete()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('inv_missing@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc_missing@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Non patient role
        self._make_doctor(email="inv_doc@test.com", password="pass123", verified=True)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('inv_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc_missing@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Member profile missing doctor
        patient_identity, _ = self._make_patient(
            email="inv_patient@test.com", password="pass123"
        )
        non_doc_identity = UserIdentity.objects.create(
            first_name="No", last_name="Doctor", phone_number="0777777777"
        )
        User.objects.create_user(
            email="non_doc@test.com", password="pass123", user_identity=non_doc_identity
        )
        Profile.objects.create(user=non_doc_identity, role=self.patient_role)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('inv_patient@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "non_doc@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # AuthAccount not found
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('inv_err@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "missing_doc@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Duplicate invite
        self._make_doctor(email="dup_doc@test.com", password="pass123", verified=True)
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "dup_doc@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "dup_doc@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_patient_edge_cases(self):
        # Authenticated user without profiles
        class DummyUser:
            is_authenticated = True

        factory = APIRequestFactory()
        request = factory.post("/api/doctors/care-team/add-patient/", {"email": "x"})
        force_authenticate(request, user=DummyUser())
        from apps.doctors.views.care_team_views import CareTeamViewSet

        response = CareTeamViewSet.as_view({"post": "add_patient"})(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Non-doctor profile
        self._make_patient(email="non_doctor@test.com", password="pass123")
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('non_doctor@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "x@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Phone only not found
        self._make_doctor(email="phone_doc@test.com", password="pass123", verified=True)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('phone_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"phone_number": "0000000000"}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Relation exists
        _, doc_profile = self._make_doctor(
            email="rel_doc@test.com", password="pass123", verified=True
        )
        patient_identity, p_profile = self._make_patient(
            email="rel_patient@test.com", password="pass123"
        )
        pending_status = InvitationStatus.objects.get(label="PENDING")
        PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=pending_status,
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('rel_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "rel_patient@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Unverified doctor
        _, unv_profile = self._make_doctor(
            email="unv_doc2@test.com", password="pass123", verified=False
        )
        request = factory.post(
            "/api/doctors/care-team/add-patient/", {"email": "x@test.com"}
        )
        force_authenticate(request, user=User.objects.get(email="unv_doc2@test.com"))
        response = CareTeamViewSet.as_view({"post": "add_patient"})(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Self add
        self._make_doctor(email="self_doc@test.com", password="pass123", verified=True)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('self_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "self_doc@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # User exists but not patient
        other_identity = UserIdentity.objects.create(
            first_name="Other", last_name="NoPatient", phone_number="0711111111"
        )
        User.objects.create_user(
            email="nopatient@test.com", password="pass123", user_identity=other_identity
        )
        Profile.objects.create(user=other_identity, role=self.doctor_role)
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "nopatient@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_patient_email_send_failure(self):
        _, doc_profile = self._make_doctor(
            email="mail_doc@test.com", password="pass123", verified=True
        )
        patient_identity, _ = self._make_patient(
            email="mail_patient@test.com", password="pass123"
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('mail_doc@test.com', 'pass123')}"
        )
        with patch("apps.doctors.views.care_team_views.send_care_team_invitation") as m:
            m.side_effect = Exception("boom")
            response = self.client.post(
                "/api/doctors/care-team/add-patient/",
                {"email": "mail_patient@test.com"},
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_accept_invitation_edge_cases(self):
        factory = APIRequestFactory()
        from apps.doctors.views.care_team_views import CareTeamViewSet

        request = factory.post("/api/doctors/care-team/accept-invitation/", {})

        class DummyUser:
            is_authenticated = True

        force_authenticate(request, user=DummyUser())
        response = CareTeamViewSet.as_view({"post": "accept_invitation"})(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Entry exists but user not invited
        patient_identity, p_profile = self._make_patient(
            email="acc_other@test.com", password="pass123"
        )
        _, doc_profile = self._make_doctor(
            email="acc_doc@test.com", password="pass123", verified=True
        )
        pending_status = InvitationStatus.objects.get(label="PENDING")
        entry = PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=pending_status,
        )
        other_identity = UserIdentity.objects.create(
            first_name="Other", last_name="User", phone_number="0788888888"
        )
        User.objects.create_user(
            email="other_acc@test.com", password="pass123", user_identity=other_identity
        )
        Profile.objects.create(user=other_identity, role=self.patient_role)
        request = factory.post(
            "/api/doctors/care-team/accept-invitation/",
            {"id_team_member": str(entry.id_team_member)},
        )
        force_authenticate(request, user=User.objects.get(email="other_acc@test.com"))
        response = CareTeamViewSet.as_view({"post": "accept_invitation"})(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Entry exists but current_user_id is missing
        request = factory.post(
            "/api/doctors/care-team/accept-invitation/",
            {"id_team_member": str(entry.id_team_member)},
        )
        dummy_user = SimpleNamespace(is_authenticated=True, user_id=None, user=None)
        force_authenticate(request, user=dummy_user)
        response = CareTeamViewSet.as_view({"post": "accept_invitation"})(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Entry not found
        request = factory.post(
            "/api/doctors/care-team/accept-invitation/",
            {"id_team_member": "b73f9a42-6e91-47f5-9d6c-6e6c0c8c8a08"},
        )
        force_authenticate(request, user=User.objects.get(email="acc_doc@test.com"))
        response = CareTeamViewSet.as_view({"post": "accept_invitation"})(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_my_team_profile_not_found(self):
        identity = UserIdentity.objects.create(first_name="No", last_name="Profile")
        account = User.objects.create_user(
            email="noprof@test.com", password="pass123", user_identity=identity
        )
        factory = APIRequestFactory()
        from apps.doctors.views.care_team_views import CareTeamViewSet

        request = factory.get("/api/doctors/care-team/my-team/")
        force_authenticate(request, user=account)
        response = CareTeamViewSet.as_view({"get": "my_team"})(request)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_my_team_patient_and_doctor(self):
        patient_identity, p_profile = self._make_patient(
            email="team_patient@test.com", password="pass123"
        )
        _, doc_profile = self._make_doctor(
            email="team_doc@test.com", password="pass123", verified=True
        )
        active_status = InvitationStatus.objects.get(label="ACTIVE")
        pending_status = InvitationStatus.objects.get(label="PENDING")
        PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=active_status,
        )
        PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=pending_status,
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('team_patient@test.com', 'pass123')}"
        )
        response = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("doctors", response.data)
        self.assertIn("family", response.data)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('team_doc@test.com', 'pass123')}"
        )
        response = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("active_patients", response.data)
        self.assertIn("pending_invites", response.data)

    def test_doctor_access_missing_and_not_found(self):
        patient_identity, p_profile = self._make_patient(
            email="missing_patient@test.com", password="pass123"
        )
        _, doc_profile = self._make_doctor(
            email="missing_doc@test.com", password="pass123", verified=True
        )
        active_status = InvitationStatus.objects.get(label="ACTIVE")
        PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=active_status,
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('missing_doc@test.com', 'pass123')}"
        )
        response = self.client.get("/api/doctors/care-team/patient-dashboard/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # patient has no AuthAccount
        identity = UserIdentity.objects.create(
            first_name="NoAuth", last_name="Patient", phone_number="0799999999"
        )
        profile = Profile.objects.create(user=identity, role=self.patient_role)
        PatientCareTeam.objects.create(
            patient_profile=profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=active_status,
        )
        response = self.client.get(
            f"/api/doctors/care-team/patient-dashboard/?patient_user_id={identity.id_user}"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_doctor_patient_views(self):
        patient_identity, p_profile = self._make_patient(
            email="pd_patient@test.com", password="pass123"
        )
        patient_account = User.objects.get(email="pd_patient@test.com")
        _, doc_profile = self._make_doctor(
            email="pd_doc@test.com", password="pass123", verified=True
        )
        active_status = InvitationStatus.objects.get(label="ACTIVE")
        PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=active_status,
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('pd_doc@test.com', 'pass123')}"
        )
        # fallback patient_id query
        response = self.client.get(
            f"/api/doctors/care-team/patient-dashboard/?patient_id={patient_identity.id_user}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # no patient_user_id
        response = self.client.get("/api/doctors/care-team/patient-dashboard/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.get(
            f"/api/doctors/care-team/patient-meals/?patient_user_id={patient_identity.id_user}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.get(
            f"/api/doctors/care-team/patient-medications/?patient_user_id={patient_identity.id_user}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.get(
            f"/api/doctors/care-team/patient-glycemia/?patient_user_id={patient_identity.id_user}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.get("/api/doctors/care-team/patient-meals/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.get("/api/doctors/care-team/patient-medications/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.get("/api/doctors/care-team/patient-glycemia/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_access_denied_no_relation(self):
        patient_identity, _ = self._make_patient(
            email="deny_patient@test.com", password="pass123"
        )
        self._make_doctor(email="deny_doc@test.com", password="pass123", verified=True)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('deny_doc@test.com', 'pass123')}"
        )
        response = self.client.get(
            f"/api/doctors/care-team/patient-dashboard/?patient_user_id={patient_identity.id_user}"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_access_doctor_role_missing(self):
        patient_identity, _ = self._make_patient(
            email="deny_patient2@test.com", password="pass123"
        )
        # Use a patient account (no doctor role)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('deny_patient2@test.com', 'pass123')}"
        )
        response = self.client.get(
            f"/api/doctors/care-team/patient-dashboard/?patient_user_id={patient_identity.id_user}"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_access_no_doctor_profile(self):
        identity = UserIdentity.objects.create(
            first_name="Doc", last_name="NoProfile", phone_number="0712345678"
        )
        User.objects.create_user(
            email="nodocprofile@test.com", password="pass123", user_identity=identity
        )
        profile = Profile.objects.create(user=identity, role=self.doctor_role)
        profile.doctor_profile.delete()
        patient_identity, _ = self._make_patient(
            email="deny_patient3@test.com", password="pass123"
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('nodocprofile@test.com', 'pass123')}"
        )
        response = self.client.get(
            f"/api/doctors/care-team/patient-dashboard/?patient_user_id={patient_identity.id_user}"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_access_patient_id_from_body(self):
        patient_identity, p_profile = self._make_patient(
            email="body_patient@test.com", password="pass123"
        )
        _, doc_profile = self._make_doctor(
            email="body_doc@test.com", password="pass123", verified=True
        )
        active_status = InvitationStatus.objects.get(label="ACTIVE")
        PatientCareTeam.objects.create(
            patient_profile=p_profile.patient_profile,
            member_profile=doc_profile,
            role="REFERENT_DOCTOR",
            status=active_status,
        )
        from apps.doctors.views.care_team_views import CareTeamViewSet

        request = SimpleNamespace(
            query_params={},
            data={"patient_user_id": str(patient_identity.id_user)},
            user=User.objects.get(email="body_doc@test.com"),
        )
        view = CareTeamViewSet()
        user, error = view._verify_doctor_access(request, None)
        self.assertIsNotNone(user)
        self.assertIsNone(error)

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

    def test_get_patient_dashboard_without_data(self):
        data = DoctorPatientDataService.get_patient_dashboard(self.user)
        self.assertIsNone(data["glucose"])
        self.assertEqual(data["alerts"], [])
        self.assertEqual(data["medication"], {"nextDose": None})
        self.assertEqual(
            data["nutrition"],
            {
                "calories": {"consumed": 0, "goal": 1800},
                "carbs": {"grams": 0, "goal": 200},
            },
        )
        self.assertEqual(
            data["activity"], {"steps": {"value": 0, "goal": 8000}, "activeMinutes": 0}
        )


class DoctorUtilsEmailTests(TestCase):
    @override_settings(DEBUG=True, DEFAULT_FROM_EMAIL="noreply@test.com")
    @patch("apps.doctors.utils.send_mail")
    def test_send_care_team_invitation_existing_user(self, mock_send):
        from apps.doctors.utils import send_care_team_invitation

        mock_send.return_value = 1
        ok = send_care_team_invitation(
            "test@example.com", "Dr Test", "REFERENT_DOCTOR", is_existing_user=True
        )
        self.assertTrue(ok)
        mock_send.assert_called_once()

    @override_settings(DEFAULT_FROM_EMAIL="noreply@test.com")
    @patch("apps.doctors.utils.send_mail")
    def test_send_care_team_invitation_new_user(self, mock_send):
        from apps.doctors.utils import send_care_team_invitation

        mock_send.return_value = 1
        ok = send_care_team_invitation(
            "test@example.com", "Dr Test", "PATIENT", is_existing_user=False
        )
        self.assertTrue(ok)

    @patch("apps.doctors.utils.send_mail", side_effect=Exception("fail"))
    def test_send_care_team_invitation_failure(self, _mock_send):
        from apps.doctors.utils import send_care_team_invitation

        ok = send_care_team_invitation(
            "test@example.com", "Dr Test", "PATIENT", is_existing_user=False
        )
        self.assertFalse(ok)

    @patch("apps.doctors.utils.send_mail")
    def test_send_doctor_verification_result_email_accept(self, mock_send):
        from apps.doctors.utils import send_doctor_verification_result_email

        mock_send.return_value = 1
        ok = send_doctor_verification_result_email("doc@test.com", True)
        self.assertTrue(ok)

    @patch("apps.doctors.utils.send_mail")
    def test_send_doctor_verification_result_email_reject(self, mock_send):
        from apps.doctors.utils import send_doctor_verification_result_email

        mock_send.return_value = 1
        ok = send_doctor_verification_result_email(
            "doc@test.com", False, rejection_reason="bad"
        )
        self.assertTrue(ok)

    @patch("apps.doctors.utils.send_mail", side_effect=Exception("fail"))
    def test_send_doctor_verification_result_email_failure(self, _mock_send):
        from apps.doctors.utils import send_doctor_verification_result_email

        ok = send_doctor_verification_result_email("doc@test.com", True)
        self.assertFalse(ok)


class DoctorVerificationViewsTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.super_role, _ = Role.objects.get_or_create(name="SUPERADMIN")
        self.doctor_role, _ = Role.objects.get_or_create(name="DOCTOR")
        self.pending_status, _ = VerificationStatus.objects.get_or_create(
            label="PENDING"
        )

    def _make_admin(self, email="admin_view@test.com"):
        identity = UserIdentity.objects.create(first_name="Admin", last_name="User")
        account = User.objects.create_user(
            email=email, password="admin123", user_identity=identity
        )
        account.is_staff = True
        account.is_superuser = True
        account.save()
        Profile.objects.create(user=identity, role=self.super_role)
        return account

    def _make_doctor(self, email="ver_doc@test.com", verified=False):
        identity = UserIdentity.objects.create(first_name="Doc", last_name="User")
        User.objects.create_user(
            email=email, password="pass123", user_identity=identity
        )
        profile = Profile.objects.create(user=identity, role=self.doctor_role)
        doc_profile = profile.doctor_profile
        doc_profile.verification_status = (
            VerificationStatus.objects.get_or_create(label="VERIFIED")[0]
            if verified
            else self.pending_status
        )
        doc_profile.license_number = "LIC-TEST"
        doc_profile.save()
        return profile

    def test_list_no_pending_status(self):
        VerificationStatus.objects.all().delete()
        from apps.doctors.views.verification_views import DoctorVerificationViewSet

        request = self.factory.get("/api/doctors/verification/")
        force_authenticate(request, user=self._make_admin("admin_list@test.com"))
        response = DoctorVerificationViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"results": []})

    def test_list_with_pending(self):
        doc_profile = self._make_doctor(email="pending_doc@test.com", verified=False)
        from apps.doctors.views.verification_views import DoctorVerificationViewSet

        request = self.factory.get("/api/doctors/verification/")
        force_authenticate(request, user=self._make_admin("admin_list2@test.com"))
        response = DoctorVerificationViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data["results"]) >= 1)
        self.assertIsNotNone(doc_profile)

    def test_permission_denied_for_non_staff(self):
        from apps.doctors.views.verification_views import IsStaffOrSuperuser

        request = self.factory.get("/api/doctors/verification/")
        request.user = AnonymousUser()
        perm = IsStaffOrSuperuser()
        self.assertFalse(perm.has_permission(request, None))

    def test_accept_doctor_not_found(self):
        from apps.doctors.views.verification_views import DoctorVerificationViewSet

        request = self.factory.post("/api/doctors/verification/accept/")
        force_authenticate(request, user=self._make_admin("admin_nf2@test.com"))
        response = DoctorVerificationViewSet.as_view({"post": "accept"})(
            request, pk="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_accept_email_exception(self):
        doc_profile = self._make_doctor(email="email_doc@test.com", verified=False)
        from apps.doctors.views.verification_views import DoctorVerificationViewSet

        with patch(
            "apps.doctors.views.verification_views.send_doctor_verification_result_email"
        ) as mock_send:
            mock_send.side_effect = Exception("fail")
            request = self.factory.post("/api/doctors/verification/accept/")
            force_authenticate(request, user=self._make_admin("admin_ok2@test.com"))
            response = DoctorVerificationViewSet.as_view({"post": "accept"})(
                request, pk=str(doc_profile.doctor_profile.doctor_id)
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_accept_creates_verified_status(self):
        VerificationStatus.objects.filter(label="VERIFIED").delete()
        doc_profile = self._make_doctor(email="ver_doc@test.com", verified=False)
        from apps.doctors.views.verification_views import DoctorVerificationViewSet

        request = self.factory.post("/api/doctors/verification/accept/")
        force_authenticate(request, user=self._make_admin("admin_ok@test.com"))
        response = DoctorVerificationViewSet.as_view({"post": "accept"})(
            request, pk=str(doc_profile.doctor_profile.doctor_id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_decline_doctor_not_found(self):
        from apps.doctors.views.verification_views import DoctorVerificationViewSet

        request = self.factory.post("/api/doctors/verification/decline/")
        force_authenticate(request, user=self._make_admin("admin_nf3@test.com"))
        response = DoctorVerificationViewSet.as_view({"post": "decline"})(
            request, pk="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_decline_invalid_uuid(self):
        from apps.doctors.views.verification_views import DoctorVerificationViewSet

        request = self.factory.post("/api/doctors/verification/decline/")
        force_authenticate(request, user=self._make_admin("admin_bad@test.com"))
        response = DoctorVerificationViewSet.as_view({"post": "decline"})(
            request, pk="invalid"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_decline_email_exception(self):
        doc_profile = self._make_doctor(email="decline_doc@test.com", verified=False)
        from apps.doctors.views.verification_views import DoctorVerificationViewSet

        with patch(
            "apps.doctors.views.verification_views.send_doctor_verification_result_email"
        ) as mock_send:
            mock_send.side_effect = Exception("fail")
            request = self.factory.post("/api/doctors/verification/decline/")
            force_authenticate(request, user=self._make_admin("admin_dec@test.com"))
            response = DoctorVerificationViewSet.as_view({"post": "decline"})(
                request, pk=str(doc_profile.doctor_profile.doctor_id)
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
