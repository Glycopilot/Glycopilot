from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()


def _mk_user_with_profile(email, role_name="PATIENT", is_superuser=False):
    for r in ("PATIENT", "DOCTOR", "FAMILY", "SUPERADMIN", "ADMIN"):
        Role.objects.get_or_create(name=r)
    identity = UserIdentity.objects.create(
        first_name="User", last_name="Test", phone_number=email[:12]
    )
    account = User.objects.create_user(email=email, password="pass123", user_identity=identity)
    if is_superuser:
        account.is_superuser = True
        account.save()
    Profile.objects.create(user=identity, role=Role.objects.get(name=role_name))
    return account, identity


class UsersListAsAdminTests(APITestCase):
    def setUp(self):
        self.admin, _ = _mk_user_with_profile("admin-list@test.com", is_superuser=True)
        self.patient1, _ = _mk_user_with_profile("patient1@test.com", "PATIENT")
        self.patient2, _ = _mk_user_with_profile("patient2@test.com", "PATIENT")
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_list_all_users(self):
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        emails = [u.get("email", "") for u in results]
        self.assertIn("patient1@test.com", emails)
        self.assertIn("patient2@test.com", emails)

    def test_admin_can_filter_by_role(self):
        response = self.client.get("/api/users/?role=patient")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_retrieve_specific_user(self):
        _, identity = self.patient1, None
        # Use the patient1's identity UUID
        patient_identity = UserIdentity.objects.get(auth_account__email="patient1@test.com")
        response = self.client.get(f"/api/users/{patient_identity.id_user}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "patient1@test.com")


class UsersMeUpdateTests(APITestCase):
    def setUp(self):
        self.account, self.identity = _mk_user_with_profile("me-update@test.com")
        self.client.force_authenticate(user=self.account)

    def test_patch_me_updates_phone(self):
        response = self.client.patch("/api/users/me/", {"phone_number": "+33611223344"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.identity.refresh_from_db()
        self.assertEqual(self.identity.phone_number, "+33611223344")

    def test_patch_me_with_last_name(self):
        response = self.client.patch("/api/users/me/", {"last_name": "NewLastName"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_me_returns_user_info(self):
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "me-update@test.com")
