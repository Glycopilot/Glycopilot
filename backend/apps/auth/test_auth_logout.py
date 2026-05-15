from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()


def _mk_patient(email="logout-test@test.com"):
    for name in ("PATIENT", "DOCTOR", "FAMILY", "SUPERADMIN"):
        Role.objects.get_or_create(name=name)
    identity = UserIdentity.objects.create(first_name="Logout", last_name="Test")
    account = User.objects.create_user(email=email, password="StrongPass123!", user_identity=identity)
    Profile.objects.create(user=identity, role=Role.objects.get(name="PATIENT"))
    return account


class LogoutEndpointTests(APITestCase):
    def setUp(self):
        self.account = _mk_patient()
        self.refresh_token = str(RefreshToken.for_user(self.account))
        self.client.force_authenticate(user=self.account)

    def test_logout_succeeds_with_valid_token(self):
        response = self.client.post("/api/auth/logout/", {"refresh": self.refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_logout_returns_400_without_refresh_token(self):
        response = self.client.post("/api/auth/logout/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_returns_200_even_with_expired_token(self):
        # Second call with already-blacklisted token should still succeed
        self.client.post("/api/auth/logout/", {"refresh": self.refresh_token})
        response = self.client.post("/api/auth/logout/", {"refresh": self.refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/auth/logout/", {"refresh": self.refresh_token})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_returns_403_when_token_belongs_to_different_user(self):
        # Create another user and use their refresh token
        other_identity = _mk_patient("logout-other@test.com")
        other_token = str(RefreshToken.for_user(other_identity))

        # Try to logout with another user's token
        response = self.client.post("/api/auth/logout/", {"refresh": other_token})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CreateAdminAccountTests(APITestCase):
    def setUp(self):
        for name in ("PATIENT", "DOCTOR", "FAMILY", "SUPERADMIN", "ADMIN"):
            Role.objects.get_or_create(name=name)
        identity = UserIdentity.objects.create(first_name="Super", last_name="Admin")
        self.superadmin = User.objects.create_user(
            email="superadmin-create@test.com",
            password="StrongPass123!",
            user_identity=identity,
        )
        self.superadmin.is_superuser = True
        self.superadmin.save()
        Profile.objects.create(user=identity, role=Role.objects.get(name="SUPERADMIN"))
        self.client.force_authenticate(user=self.superadmin)

    def test_superadmin_can_create_admin_account(self):
        response = self.client.post("/api/auth/create-admin/", {
            "email": "newadmin@test.com",
            "first_name": "New",
            "last_name": "Admin",
            "password": "AdminPass123!",
            "password_confirm": "AdminPass123!",
            "account_type": "ADMIN",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "newadmin@test.com")

    def test_non_superadmin_cannot_create_admin(self):
        identity = UserIdentity.objects.create(first_name="Regular", last_name="User")
        regular = User.objects.create_user(
            email="regular-admin@test.com", password="pass123", user_identity=identity
        )
        Profile.objects.create(user=identity, role=Role.objects.get(name="PATIENT"))
        self.client.force_authenticate(user=regular)

        response = self.client.post("/api/auth/create-admin/", {
            "email": "hack@test.com",
            "first_name": "Hack",
            "last_name": "Attempt",
            "password": "HackPass123!",
            "password_confirm": "HackPass123!",
            "account_type": "ADMIN",
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
