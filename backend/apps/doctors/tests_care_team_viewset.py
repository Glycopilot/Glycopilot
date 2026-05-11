import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APIClient

from apps.doctors.models import (
    InvitationStatus,
    PatientCareTeam,
    VerificationStatus,
)
from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()


class CareTeamViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient_role, _ = Role.objects.get_or_create(name="PATIENT")
        self.doctor_role, _ = Role.objects.get_or_create(name="DOCTOR")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")
        self.verified_status, _ = VerificationStatus.objects.get_or_create(
            label="VERIFIED"
        )

        # Create Patient
        self.patient_identity = UserIdentity.objects.create(
            first_name="Paul", last_name="Patient", phone_number="0600000001"
        )
        self.patient_user = User.objects.create_user(
            email="paul@test.com",
            password="pass123",
            user_identity=self.patient_identity,
        )
        self.patient_profile = Profile.objects.create(
            user=self.patient_identity, role=self.patient_role
        )

        # Create Doctor
        self.doctor_identity = UserIdentity.objects.create(
            first_name="Doc", last_name="Who", phone_number="0600000002"
        )
        self.doctor_user = User.objects.create_user(
            email="doc@test.com", password="pass123", user_identity=self.doctor_identity
        )
        self.doctor_profile = Profile.objects.create(
            user=self.doctor_identity, role=self.doctor_role
        )
        self.doctor_profile.doctor_profile.verification_status = self.verified_status
        self.doctor_profile.doctor_profile.license_number = "LIC-123"
        self.doctor_profile.doctor_profile.save()

    def _token_for(self, email, password):
        r = self.client.post("/api/auth/login/", {"email": email, "password": password})
        return r.data["access"]

    # ── remove_member ──────────────────────────────────────────────────────────

    def test_remove_member_success(self):
        active_status = InvitationStatus.objects.get(label="ACTIVE")
        entry = PatientCareTeam.objects.create(
            patient_profile=self.patient_profile.patient_profile,
            member_profile=self.doctor_profile,
            role="REFERENT_DOCTOR",
            status=active_status,
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/remove-member/",
            {"id_team_member": str(entry.id_team_member)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            PatientCareTeam.objects.filter(id_team_member=entry.id_team_member).exists()
        )

    def test_remove_member_not_found(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/remove-member/",
            {"id_team_member": str(uuid.uuid4())},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_remove_member_missing_id(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post("/api/doctors/care-team/remove-member/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_member_not_patient(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/remove-member/",
            {"id_team_member": str(uuid.uuid4())},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── add_family_member ──────────────────────────────────────────────────────

    def test_add_family_member_success(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {
                "first_name": "Marie",
                "last_name": "Dupont",
                "phone_number": "0611111111",
                "role": "FAMILY",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)

    def test_add_family_member_invalid_role(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {"first_name": "Marie", "last_name": "Dupont", "role": "DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_family_member_missing_name(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {"last_name": "Dupont", "role": "FAMILY"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_family_member_not_patient(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {"first_name": "X", "last_name": "Y", "role": "FAMILY"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── invite_doctor ──────────────────────────────────────────────────────────

    def test_invite_doctor_missing_email(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/", {"role": "REFERENT_DOCTOR"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invite_doctor_invalid_role(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc@test.com", "role": "FAMILY"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invite_doctor_self_invite(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "paul@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invite_doctor_not_found(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "unknown@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.doctors.utils.send_care_team_invitation")
    def test_invite_doctor_success(self, mock_send):
        mock_send.return_value = None
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ── add_patient ────────────────────────────────────────────────────────────

    def test_add_patient_not_doctor(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "other@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_add_patient_missing_contact(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
        )
        response = self.client.post("/api/doctors/care-team/add-patient/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_patient_self_add(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "doc@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.doctors.utils.send_care_team_invitation")
    def test_add_patient_success(self, mock_send):
        mock_send.return_value = None
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "paul@test.com"}
        )
        self.assertIn(
            response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK]
        )

    # ── accept_invitation ──────────────────────────────────────────────────────

    def test_accept_invitation_missing_id(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
        )
        response = self.client.post("/api/doctors/care-team/accept-invitation/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accept_invitation_not_found(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/accept-invitation/",
            {"id_team_member": str(uuid.uuid4())},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_accept_invitation_success(self):
        pending_status = InvitationStatus.objects.get(label="PENDING")
        entry = PatientCareTeam.objects.create(
            patient_profile=self.patient_profile.patient_profile,
            member_profile=self.doctor_profile,
            role="REFERENT_DOCTOR",
            status=pending_status,
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/accept-invitation/",
            {"id_team_member": str(entry.id_team_member)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ── my_team ────────────────────────────────────────────────────────────────

    def test_my_team_as_patient(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("doctors", response.data)
        self.assertIn("family", response.data)

    def test_my_team_as_doctor(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
        )
        response = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("active_patients", response.data)
        self.assertIn("pending_invites", response.data)

    # ── patient data endpoints ─────────────────────────────────────────────────

    @patch("apps.doctors.views.care_team_views.verify_doctor_can_access_patient")
    def test_get_patient_dashboard_success(self, mock_verify):
        mock_verify.return_value = (self.patient_user, None)
        with patch(
            "apps.doctors.services.DoctorPatientDataService.get_patient_dashboard"
        ) as mock_get_dashboard:
            mock_get_dashboard.return_value = {"dashboard": "data"}
            self.client.credentials(
                HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
            )
            response = self.client.get(
                "/api/doctors/care-team/patient-dashboard/",
                {"patient_user_id": str(self.patient_user.id_auth)},
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["dashboard"], "data")

    @patch("apps.doctors.views.care_team_views.verify_doctor_can_access_patient")
    def test_get_patient_meals_success(self, mock_verify):
        mock_verify.return_value = (self.patient_user, None)
        with patch(
            "apps.doctors.services.DoctorPatientDataService.get_meals_history"
        ) as mock_get_meals:
            mock_get_meals.return_value = []
            self.client.credentials(
                HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
            )
            response = self.client.get(
                "/api/doctors/care-team/patient-meals/",
                {"patient_user_id": str(self.patient_user.id_auth)},
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch("apps.doctors.views.care_team_views.verify_doctor_can_access_patient")
    def test_get_patient_medications_success(self, mock_verify):
        mock_verify.return_value = (self.patient_user, None)
        with patch(
            "apps.doctors.services.DoctorPatientDataService.get_medications_history"
        ) as mock_get_meds:
            mock_get_meds.return_value = []
            self.client.credentials(
                HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
            )
            response = self.client.get(
                "/api/doctors/care-team/patient-medications/",
                {"patient_user_id": str(self.patient_user.id_auth)},
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch("apps.doctors.views.care_team_views.verify_doctor_can_access_patient")
    def test_get_patient_glycemia_success(self, mock_verify):
        mock_verify.return_value = (self.patient_user, None)
        with patch(
            "apps.doctors.services.DoctorPatientDataService.get_glycemia_history"
        ) as mock_get_gly:
            mock_get_gly.return_value = []
            self.client.credentials(
                HTTP_AUTHORIZATION=f"Bearer {self._token_for('doc@test.com', 'pass123')}"
            )
            response = self.client.get(
                "/api/doctors/care-team/patient-glycemia/",
                {"patient_user_id": str(self.patient_user.id_auth)},
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
