from django.urls import reverse

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.doctors.models import VerificationStatus
from apps.profiles.models import Profile, Role
from apps.users.models import AuthAccount, User


@pytest.mark.django_db
class TestAuthEndpoints:
    @pytest.fixture(autouse=True)
    def setup_base_data(self):
        # Create mandatory roles
        self.patient_role = Role.objects.create(name="PATIENT")
        self.doctor_role = Role.objects.create(name="DOCTOR")
        VerificationStatus.objects.get_or_create(label="PENDING")
        VerificationStatus.objects.get_or_create(label="VERIFIED")

    def test_register_creates_all_entities(self, client):
        """
        Verify /register creates User, AuthAccount and Profile
        """
        url = reverse("register")
        data = {
            "email": "test@gmail.com",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "first_name": "John",
            "last_name": "Doe",
            "role": "PATIENT",
        }

        response = client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # Verify DB
        assert AuthAccount.objects.count() == 1
        account = AuthAccount.objects.first()
        assert account.email == "test@gmail.com"

        # Check Identity link
        identity = account.user
        assert identity.first_name == "John"

        # Check Profile link
        assert Profile.objects.filter(user=identity, role__name="PATIENT").exists()

    def test_register_doctor_requires_license_and_specialty(self, client):
        url = reverse("register")
        data = {
            "email": "doc@test.com",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "first_name": "Doc",
            "last_name": "Test",
            "role": "DOCTOR",
        }
        response = client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "license_number" in response.data or "specialty" in response.data

        data["license_number"] = "12345"
        response = client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "specialty" in response.data

    def test_register_doctor_returns_message_without_tokens(self, client):
        url = reverse("register")
        data = {
            "email": "doc2@test.com",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "first_name": "Doc",
            "last_name": "Test",
            "role": "DOCTOR",
            "license_number": "RPPS-123",
            "specialty": "Cardio",
        }
        response = client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert "message" in response.data
        assert "access" not in response.data

    def test_login_success(self, client):
        # Setup User
        identity = User.objects.create(first_name="Jane", last_name="Doe")
        account = AuthAccount.objects.create_user(
            email="jane@gmail.com", password="Password123", user_identity=identity
        )
        Profile.objects.create(user=identity, role=self.patient_role)

        url = reverse("login")
        data = {"email": "jane@gmail.com", "password": "Password123"}
        response = client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

        # Verify profile data
        user_data = response.data["user"]
        assert "identity" in user_data
        identity_data = user_data["identity"]
        assert "profiles" in identity_data

        profiles = identity_data["profiles"]
        assert len(profiles) == 1
        assert profiles[0]["role_name"] == "PATIENT"

    def test_login_unverified_doctor_blocked(self, client):
        identity = User.objects.create(first_name="Doc", last_name="Wait")
        account = AuthAccount.objects.create_user(
            email="waitdoc@gmail.com", password="Password123", user_identity=identity
        )
        profile = Profile.objects.create(user=identity, role=self.doctor_role)
        pending_status, _ = VerificationStatus.objects.get_or_create(label="PENDING")
        profile.doctor_profile.verification_status = pending_status
        profile.doctor_profile.license_number = "RPPS-000"
        profile.doctor_profile.save()

        url = reverse("login")
        data = {"email": "waitdoc@gmail.com", "password": "Password123"}
        response = client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "non_field_errors" in response.data

    def test_forgot_password_sends_email(self, mailoutbox, client):
        # Setup User
        identity = User.objects.create(first_name="Forgot", last_name="User")
        AuthAccount.objects.create_user(
            email="forgot@gmail.com", password="Password123", user_identity=identity
        )

        # django_rest_passwordreset endpoint
        url = reverse("password_reset:reset-password-request")
        data = {"email": "forgot@gmail.com"}

        response = client.post(url, data)
        assert response.status_code == status.HTTP_200_OK

        # Check email sent
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == ["forgot@gmail.com"]
        assert "reset-password?token=" in mailoutbox[0].body

    def test_refresh_token_missing(self, client):
        url = reverse("refresh_token")
        response = client.post(url, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "refresh" in response.data

    def test_create_admin_requires_superuser(self):
        identity = User.objects.create(first_name="Normal", last_name="User")
        account = AuthAccount.objects.create_user(
            email="normal@gmail.com", password="Password123", user_identity=identity
        )
        Profile.objects.create(user=identity, role=self.patient_role)
        api_client = APIClient()
        api_client.force_authenticate(user=account)
        url = reverse("create_admin_account")
        response = api_client.post(
            url,
            {
                "email": "admin2@example.com",
                "first_name": "Admin",
                "last_name": "User",
                "password": "Password123!",
                "password_confirm": "Password123!",
                "account_type": "ADMIN",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
