"""Tests for users app — UserViewSet me endpoint (GET + PATCH)."""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.doctors.models import DoctorProfile, InvitationStatus, VerificationStatus
from apps.profiles.models import Profile, Role
from apps.users.models import AuthAccount
from apps.users.models import User as UserIdentity

# ─── Helpers ────────────────────────────────────────────────────────────────


def _make_user(
    email="user_me@test.com", password="pass123", first_name="John", last_name="Doe"
):
    identity = UserIdentity.objects.create(first_name=first_name, last_name=last_name)
    account = AuthAccount.objects.create_user(
        email=email, password=password, user_identity=identity
    )
    return account, identity


def _make_patient(email="patient_me@test.com"):
    patient_role, _ = Role.objects.get_or_create(name="PATIENT")
    account, identity = _make_user(email=email)
    profile = Profile.objects.create(user=identity, role=patient_role)
    return account, identity, profile


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ─── GET /api/users/me/ ──────────────────────────────────────────────────────


@pytest.mark.django_db
class TestUsersMeGet:
    def test_me_returns_authenticated_user_identity(self):
        account, identity = _make_user()
        client = _auth_client(account)

        resp = client.get("/api/users/me/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["first_name"] == "John"

    def test_me_unauthenticated_returns_401(self):
        client = APIClient()
        resp = client.get("/api/users/me/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ─── PATCH /api/users/me/ ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestUsersMePatch:
    def test_patch_me_updates_name(self):
        account, identity = _make_user()
        client = _auth_client(account)

        resp = client.patch("/api/users/me/", {"first_name": "Jane"})
        assert resp.status_code == status.HTTP_200_OK
        identity.refresh_from_db()
        assert identity.first_name == "Jane"

    def test_patch_me_with_patient_details_updates_profile(self):
        account, identity, profile = _make_patient()
        from apps.profiles.models import PatientProfile

        pp, _ = PatientProfile.objects.get_or_create(profile=profile)
        pp.diabetes_type = "type1"
        pp.save()
        client = _auth_client(account)

        resp = client.patch(
            "/api/users/me/",
            {
                "patient_details": {
                    "diabetes_type": "type2",
                    "diagnosis_date": "2020-01-01",
                }
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        from apps.profiles.models import PatientProfile

        pp = PatientProfile.objects.get(profile=profile)
        assert pp.diabetes_type == "type2"

    def test_patch_me_with_invalid_medical_id_returns_404(self):
        account, identity, _ = _make_patient()
        client = _auth_client(account)

        resp = client.patch(
            "/api/users/me/",
            {"medical_id": "INVALID-LICENSE-999"},
            format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_me_with_valid_medical_id_creates_care_team(self):
        account, identity, patient_profile = _make_patient("patient2@test.com")
        doctor_role, _ = Role.objects.get_or_create(name="DOCTOR")
        InvitationStatus.objects.get_or_create(label="PENDING")
        VerificationStatus.objects.get_or_create(label="VERIFIED")

        # Create a doctor
        doc_identity = UserIdentity.objects.create(first_name="Dr", last_name="Smith")
        doc_account = AuthAccount.objects.create_user(
            email="doctor@test.com", password="pass123", user_identity=doc_identity
        )
        doc_profile = Profile.objects.create(user=doc_identity, role=doctor_role)
        # Update the doctor profile created by signal or get_or_create it
        dp, _ = DoctorProfile.objects.get_or_create(profile=doc_profile)
        dp.license_number = "LIC-001"
        dp.save()

        client = _auth_client(account)
        resp = client.patch(
            "/api/users/me/",
            {"medical_id": "LIC-001"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        from apps.doctors.models import PatientCareTeam

        assert PatientCareTeam.objects.filter(
            patient_profile=patient_profile.patient_profile
        ).exists()


# ─── Admin operations ────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestUsersAdminOperations:
    def test_non_admin_cannot_create_user(self):
        account, _ = _make_user()
        client = _auth_client(account)

        resp = client.post(
            "/api/users/",
            {"first_name": "New", "last_name": "User"},
        )
        assert resp.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_admin_can_list_all_users(self):
        """Admin user should see all users."""
        admin_role, _ = Role.objects.get_or_create(name="ADMIN")
        admin_account, admin_identity = _make_user("admin@test.com")
        admin_account.is_superuser = True
        admin_account.save()
        _make_user("other@test.com")

        client = _auth_client(admin_account)
        resp = client.get("/api/users/")
        assert resp.status_code == status.HTTP_200_OK
        # Handle pagination
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) >= 2

    def test_regular_user_only_sees_self(self):
        account, _ = _make_user("self@test.com")
        _make_user("other2@test.com")
        client = _auth_client(account)

        resp = client.get("/api/users/")
        assert resp.status_code == status.HTTP_200_OK
        # Handle pagination
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) == 1
