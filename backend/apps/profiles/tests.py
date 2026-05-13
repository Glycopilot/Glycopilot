from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()


def _setup_patient():
    patient_role, _ = Role.objects.get_or_create(name="PATIENT")
    identity = UserIdentity.objects.create(first_name="Alice", last_name="Test", phone_number="0611111111")
    account = User.objects.create_user(email="profile-patient@test.com", password="pass123", user_identity=identity)
    profile = Profile.objects.create(user=identity, role=patient_role)
    return account, profile


class ProfileAPITests(APITestCase):
    def setUp(self):
        self.account, self.profile = _setup_patient()
        self.client.force_authenticate(user=self.account)

    def test_get_current_user_profile_returns_200(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_profile_contains_user_data(self):
        response = self.client.get("/api/auth/me/")
        self.assertIn("email", response.data)
        self.assertEqual(response.data["email"], "profile-patient@test.com")

    def test_unauthenticated_user_cannot_get_profile(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile_via_patch(self):
        response = self.client.patch("/api/users/me/", {"first_name": "Updated"}, format="json")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])


class ProfileModelTests(APITestCase):
    def test_role_str_representation(self):
        role, _ = Role.objects.get_or_create(name="TEST_ROLE")
        self.assertEqual(str(role), "TEST_ROLE")

    def test_profile_is_linked_to_identity_and_role(self):
        role, _ = Role.objects.get_or_create(name="PATIENT")
        identity = UserIdentity.objects.create(first_name="Bob", last_name="Smith", phone_number="0622222222")
        profile = Profile.objects.create(user=identity, role=role)

        self.assertEqual(profile.user, identity)
        self.assertEqual(profile.role, role)
