"""
Tests : création compte patient, invitations, admin valide le docteur,
docteur non validé = indisponible pour le patient, docteur validé peut ajouter un patient.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import requests

from rest_framework import status
from rest_framework.test import APIClient

from apps.doctors.models import (
    DoctorProfile,
    InvitationStatus,
    PatientCareTeam,
    VerificationStatus,
)
from apps.doctors.doctor_patient_access import verify_doctor_can_access_patient
from apps.doctors.services.verification import DoctorVerificationService
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
        VerificationStatus.objects.get_or_create(label="REJECTED")

    def _token_for(self, email, password):
        """Retourne le token d'accès pour email/password."""
        r = self.client.post("/api/auth/login/", {"email": email, "password": password})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        return r.data["access"]

    def test_care_team_add_family(self):
        """POST /api/doctors/care-team/add-family/ : patient ajoute un membre famille."""
        patient_identity = UserIdentity.objects.create(
            first_name="Paul", last_name="Patient", phone_number="0600000001"
        )
        User.objects.create_user(
            email="paul_addfam@test.com",
            password="pass123",
            user_identity=patient_identity,
        )
        Profile.objects.create(user=patient_identity, role=self.patient_role)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul_addfam@test.com', 'pass123')}"
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
        self.assertIn("message", response.data)
        self.assertIn("id", response.data)

    def test_care_team_my_team(self):
        """GET /api/doctors/care-team/my-team/."""
        doctor_identity = UserIdentity.objects.create(
            first_name="Doc", last_name="MyTeam", phone_number="0600000002"
        )
        User.objects.create_user(
            email="doc_myteam@test.com",
            password="pass123",
            user_identity=doctor_identity,
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_profile.doctor_profile.verification_status = self.verified_status
        doc_profile.doctor_profile.license_number = "LIC-MT"
        doc_profile.doctor_profile.save()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc_myteam@test.com', 'pass123')}"
        )
        response = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("active_patients", response.data)
        self.assertIn("pending_invites", response.data)


class DoctorVerificationServiceTests(CareTeamIntegrationTests):
    @override_settings(LICENCE_VERIFICATION_API=None)
    def test_verify_license_returns_false_when_api_is_not_configured(self):
        self.assertFalse(DoctorVerificationService.verify_license("123456789"))

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    def test_verify_license_returns_false_without_license_number(self):
        self.assertFalse(DoctorVerificationService.verify_license(""))

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_accepts_fhir_bundle_with_entries(self, mock_get):
        response = MagicMock(status_code=200)
        response.json.return_value = {
            "resourceType": "Bundle",
            "total": 1,
            "entry": [{"resource": {"id": "doctor-1"}}],
        }
        mock_get.return_value = response

        self.assertTrue(DoctorVerificationService.verify_license("RPPS123"))
        mock_get.assert_called_once_with(
            "https://annuaire.test/Practitioner?identifier=RPPS123", timeout=5
        )

    @override_settings(
        LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner?active=true"
    )
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_uses_ampersand_when_api_url_has_query(self, mock_get):
        response = MagicMock(status_code=200)
        response.json.return_value = {"resourceType": "Bundle", "total": 0, "entry": []}
        mock_get.return_value = response

        self.assertFalse(DoctorVerificationService.verify_license("RPPS123"))
        mock_get.assert_called_once_with(
            "https://annuaire.test/Practitioner?active=true&identifier=RPPS123",
            timeout=5,
        )

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_rejects_non_success_status(self, mock_get):
        mock_get.return_value = MagicMock(status_code=503)

        self.assertFalse(DoctorVerificationService.verify_license("RPPS123"))

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_rejects_non_json_response(self, mock_get):
        response = MagicMock(status_code=200)
        response.json.side_effect = requests.exceptions.JSONDecodeError("bad", "", 0)
        mock_get.return_value = response

        self.assertFalse(DoctorVerificationService.verify_license("RPPS123"))

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_handles_request_exception(self, mock_get):
        mock_get.side_effect = requests.RequestException("network down")

        self.assertFalse(DoctorVerificationService.verify_license("RPPS123"))


    def test_care_team_accept_invitation(self):
        """POST /api/doctors/care-team/accept-invitation/ (route existe)."""
        patient_identity = UserIdentity.objects.create(
            first_name="Inv", last_name="Pat", phone_number="0600000003"
        )
        User.objects.create_user(
            email="inv_pat@test.com", password="pass123", user_identity=patient_identity
        )
        Profile.objects.create(user=patient_identity, role=self.patient_role)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('inv_pat@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/accept-invitation/", {}, format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST),
        )

    def test_medecins_patients_list(self):
        """GET /api/doctors/medecins-patients/."""
        doctor_identity = UserIdentity.objects.create(
            first_name="List", last_name="Doc", phone_number="0600000004"
        )
        User.objects.create_user(
            email="list_doc@test.com", password="pass123", user_identity=doctor_identity
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_profile.doctor_profile.verification_status = self.verified_status
        doc_profile.doctor_profile.license_number = "LIC-LIST"
        doc_profile.doctor_profile.save()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('list_doc@test.com', 'pass123')}"
        )
        response = self.client.get("/api/doctors/medecins-patients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("patients_par_medecin", response.data)
        self.assertIn("medecins_avec_patients", response.data)

    def test_verification_decline(self):
        """POST /api/doctors/verification/<id>/decline/ : admin refuse un docteur."""
        doctor_identity = UserIdentity.objects.create(
            first_name="Decline", last_name="Doc", phone_number="0677777000"
        )
        User.objects.create_user(
            email="decline_doc@test.com",
            password="pass123",
            user_identity=doctor_identity,
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_prof = doc_profile.doctor_profile
        doc_prof.verification_status = self.pending_status
        doc_prof.license_number = "LIC-DECLINE"
        doc_prof.save()
        admin_identity = UserIdentity.objects.create(
            first_name="Admin", last_name="Two"
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
        response = self.client.post(
            f"/api/doctors/verification/{doc_prof.doctor_id}/decline/",
            {"rejection_reason": "Documents incomplets"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        doc_prof.refresh_from_db()
        self.assertEqual(doc_prof.verification_status.label, "REJECTED")

    def test_patient_register_creates_account(self):
        """Création d'un compte patient via l'API register.
        Depuis l'ajout de la vérification email, retourne un message (pas de JWT).
        """
        from unittest.mock import patch
        data = {
            "email": "patient_care@test.com",
            "password": "Password123!",
            "password_confirm": "Password123!",
            "first_name": "Jean",
            "last_name": "Patient",
            "role": "PATIENT",
        }
        with patch("apps.auth.serializers._verify_email_domain"), \
             patch("apps.auth.views._send_verification_link"):
            response = self.client.post("/api/auth/register/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(User.objects.filter(email="patient_care@test.com").exists())

    def test_patient_invite_unverified_doctor_returns_not_available(self):
        """Le patient ne peut pas inviter un docteur non validé : compte indisponible / inexistant."""
        # Créer patient (manuellement pour avoir PatientProfile via signal)
        patient_identity = UserIdentity.objects.create(
            first_name="Paul", last_name="Patient", phone_number="0600000001"
        )
        patient_account = User.objects.create_user(
            email="paul@test.com", password="pass123", user_identity=patient_identity
        )
        p_profile = Profile.objects.create(
            user=patient_identity, role=self.patient_role
        )
        self.assertTrue(hasattr(p_profile, "patient_profile"))

        # Créer docteur NON vérifié (PENDING)
        doctor_identity = UserIdentity.objects.create(
            first_name="Doc", last_name="Unverified", phone_number="0600000002"
        )
        User.objects.create_user(
            email="doc_unverified@test.com",
            password="pass123",
            user_identity=doctor_identity,
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_prof = doc_profile.doctor_profile
        doc_prof.verification_status = self.pending_status
        doc_prof.license_number = "LIC-PENDING"
        doc_prof.save()

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
        patient_identity = UserIdentity.objects.create(
            first_name="Alice", last_name="Patient", phone_number="0611111111"
        )
        User.objects.create_user(
            email="alice@test.com", password="pass123", user_identity=patient_identity
        )
        p_profile = Profile.objects.create(
            user=patient_identity, role=self.patient_role
        )

        # Docteur PENDING
        doctor_identity = UserIdentity.objects.create(
            first_name="Bob", last_name="Doctor", phone_number="0622222222"
        )
        User.objects.create_user(
            email="bob_doctor@test.com",
            password="pass123",
            user_identity=doctor_identity,
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_prof = doc_profile.doctor_profile
        doc_prof.verification_status = self.pending_status
        doc_prof.license_number = "LIC-002"
        doc_prof.save()

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
        doctor_identity = UserIdentity.objects.create(
            first_name="Unv", last_name="Doc", phone_number="0633333333"
        )
        User.objects.create_user(
            email="unv_doc@test.com", password="pass123", user_identity=doctor_identity
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_profile.doctor_profile.verification_status = self.pending_status
        doc_profile.doctor_profile.license_number = "LIC-UNV"
        doc_profile.doctor_profile.save()

        patient_identity = UserIdentity.objects.create(
            first_name="Pat", last_name="Two", phone_number="0644444444"
        )
        User.objects.create_user(
            email="pat_two@test.com", password="pass123", user_identity=patient_identity
        )
        Profile.objects.create(user=patient_identity, role=self.patient_role)

        response = self.client.post(
            "/api/auth/login/", {"email": "unv_doc@test.com", "password": "pass123"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_verified_doctor_can_add_patient(self):
        """Après validation par l'admin, le docteur peut ajouter un patient."""
        doctor_identity = UserIdentity.objects.create(
            first_name="Verified", last_name="Doc", phone_number="0655555555"
        )
        User.objects.create_user(
            email="verified_doc@test.com",
            password="pass123",
            user_identity=doctor_identity,
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_profile.doctor_profile.verification_status = self.verified_status
        doc_profile.doctor_profile.license_number = "LIC-VERIFIED"
        doc_profile.doctor_profile.save()

        patient_identity = UserIdentity.objects.create(
            first_name="NewPat", last_name="Three", phone_number="0666666666"
        )
        User.objects.create_user(
            email="newpat@test.com", password="pass123", user_identity=patient_identity
        )
        Profile.objects.create(user=patient_identity, role=self.patient_role)

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
        patient_identity = UserIdentity.objects.create(
            first_name="Full", last_name="Patient", phone_number="0677777777"
        )
        User.objects.create_user(
            email="full_patient@test.com",
            password="pass123",
            user_identity=patient_identity,
        )
        p_profile = Profile.objects.create(
            user=patient_identity, role=self.patient_role
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
        doctor_identity = UserIdentity.objects.create(
            first_name="Full", last_name="Doc", phone_number="0688888888"
        )
        User.objects.create_user(
            email="full_doc@test.com", password="pass123", user_identity=doctor_identity
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_prof = doc_profile.doctor_profile
        doc_prof.verification_status = self.pending_status
        doc_prof.license_number = "LIC-FULL"
        doc_prof.save()

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
        patient2_identity = UserIdentity.objects.create(
            first_name="Second", last_name="Patient", phone_number="0699999999"
        )
        User.objects.create_user(
            email="second_patient@test.com",
            password="pass123",
            user_identity=patient2_identity,
        )
        Profile.objects.create(user=patient2_identity, role=self.patient_role)

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


class DoctorPatientAccessTests(TestCase):
    def _request(self, user=None, query=None, data=None):
        return SimpleNamespace(
            user=user,
            query_params=query or {},
            data=data or {},
        )

    def test_access_requires_patient_id(self):
        patient, response = verify_doctor_can_access_patient(self._request())

        self.assertIsNone(patient)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "patient_user_id is required")

    def test_access_rejects_non_doctor_user(self):
        user = SimpleNamespace(profiles=MagicMock())
        user.profiles.filter.return_value.first.return_value = None

        patient, response = verify_doctor_can_access_patient(
            self._request(user=user, query={"patient_user_id": "patient-1"})
        )

        self.assertIsNone(patient)
        self.assertEqual(response.status_code, 403)
        self.assertIn("Doctors only", response.data["error"])

    @patch("apps.doctors.doctor_patient_access.PatientCareTeam.objects.filter")
    def test_access_rejects_doctor_without_active_care_team_entry(self, filter_mock):
        doctor_profile = SimpleNamespace(doctor_profile=SimpleNamespace())
        doctor = SimpleNamespace(profiles=MagicMock())
        doctor.profiles.filter.return_value.first.return_value = doctor_profile
        filter_mock.return_value.exists.return_value = False

        patient, response = verify_doctor_can_access_patient(
            self._request(user=doctor, query={"patient_user_id": "patient-1"})
        )

        self.assertIsNone(patient)
        self.assertEqual(response.status_code, 403)
        self.assertIn("not an active doctor", response.data["error"])

    @patch("apps.doctors.doctor_patient_access.AuthAccount.objects.get")
    @patch("apps.doctors.doctor_patient_access.PatientCareTeam.objects.filter")
    def test_access_returns_patient_when_doctor_has_active_relation(
        self, filter_mock, get_mock
    ):
        doctor_profile = SimpleNamespace(doctor_profile=SimpleNamespace())
        doctor = SimpleNamespace(profiles=MagicMock())
        doctor.profiles.filter.return_value.first.return_value = doctor_profile
        filter_mock.return_value.exists.return_value = True
        patient_account = SimpleNamespace(email="patient@example.com")
        get_mock.return_value = patient_account

        patient, response = verify_doctor_can_access_patient(
            self._request(user=doctor, data={"patient_id": "patient-1"})
        )

        self.assertIs(patient, patient_account)
        self.assertIsNone(response)
