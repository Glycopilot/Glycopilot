from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()


def _mk_patient(email="auth-more@test.com"):
    Role.objects.get_or_create(name="PATIENT")
    Role.objects.get_or_create(name="DOCTOR")
    Role.objects.get_or_create(name="FAMILY")
    Role.objects.get_or_create(name="SUPERADMIN")
    identity = UserIdentity.objects.create(first_name="Auth", last_name="More")
    account = User.objects.create_user(email=email, password="StrongPass123!", user_identity=identity)
    patient_role = Role.objects.get(name="PATIENT")
    Profile.objects.create(user=identity, role=patient_role)
    return account


class LoginEndpointTests(APITestCase):
    def setUp(self):
        self.account = _mk_patient()

    def test_login_returns_tokens(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "auth-more@test.com", "password": "StrongPass123!"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_fails_with_wrong_password(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "auth-more@test.com", "password": "WrongPass!"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_fails_with_unknown_email(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "unknown@test.com", "password": "anything"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RefreshTokenEndpointTests(APITestCase):
    def setUp(self):
        self.account = _mk_patient("refresh-more@test.com")
        self.refresh_token = str(RefreshToken.for_user(self.account))

    def test_refresh_returns_new_access_token(self):
        response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": self.refresh_token},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_refresh_returns_400_when_token_missing(self):
        response = self.client.post("/api/auth/refresh/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_returns_error_with_invalid_token(self):
        response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": "not-a-valid-token"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeEndpointTests(APITestCase):
    def setUp(self):
        self.account = _mk_patient("me-more@test.com")
        self.client.force_authenticate(user=self.account)

    def test_me_returns_200_with_user_data(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "me-more@test.com")

    def test_me_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
