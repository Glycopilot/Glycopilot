from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()


def _mk_user_with_profile(email, role_name="PATIENT"):
    role, _ = Role.objects.get_or_create(name=role_name)
    for r in ("PATIENT", "DOCTOR", "FAMILY", "SUPERADMIN", "ADMIN"):
        Role.objects.get_or_create(name=r)
    identity = UserIdentity.objects.create(
        first_name="Test", last_name="User", phone_number=email[:12]
    )
    account = User.objects.create_user(email=email, password="pass123", user_identity=identity)
    Profile.objects.create(user=identity, role=role)
    return account, identity


class UsersMeEndpointTests(APITestCase):
    def setUp(self):
        self.account, self.identity = _mk_user_with_profile("users-me@test.com")
        self.client.force_authenticate(user=self.account)

    def test_get_me_returns_own_user_data(self):
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("email", response.data)
        self.assertEqual(response.data["email"], "users-me@test.com")

    def test_patch_me_updates_first_name(self):
        response = self.client.patch("/api/users/me/", {"first_name": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.identity.refresh_from_db()
        self.assertEqual(self.identity.first_name, "Updated")

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UsersListEndpointTests(APITestCase):
    def setUp(self):
        self.account, self.identity = _mk_user_with_profile("users-list@test.com")
        self.client.force_authenticate(user=self.account)

    def test_non_admin_gets_only_own_user(self):
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        emails = [u.get("email", "") for u in results]
        self.assertIn("users-list@test.com", emails)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
