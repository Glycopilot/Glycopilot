"""
Tests for checking User model and API
Updated to reflect the separation of User and Profile/Role
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import Profile

User = get_user_model()


class UserModelTest(TestCase):
    """
    Tests for User model
    """

    def setUp(self):
        """Setup test data"""
        self.user_data = {
            "email": "testuser@example.com",
            "password": "testpassword123",
        }

    def test_create_user(self):
        """Test user creation"""
        # We need to manually link identity if we want specific first_name, or just create account
        user = User.objects.create_user(**self.user_data)

        self.assertIsNotNone(user.id_auth)
        self.assertEqual(user.email, "testuser@example.com")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertTrue(user.is_active)
        # Check identity was auto-created
        self.assertIsNotNone(user.user)

    def test_create_superuser(self):
        """Test superuser creation"""
        user = User.objects.create_superuser(**self.user_data)

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_user_email_unique(self):
        """Test email uniqueness"""
        User.objects.create_user(**self.user_data)
        duplicate_data = self.user_data.copy()
        with self.assertRaises(Exception):
            User.objects.create_user(**duplicate_data)


from apps.profiles.models import Role
from apps.users.models import User as UserIdentity


class UserAPITest(TestCase):
    """
    Tests for User API endpoints
    """

    def setUp(self):
        """Setup test data"""
        self.client = APIClient()

        # Create Identity
        self.identity = UserIdentity.objects.create(first_name="API", last_name="User")

        # Create Auth
        self.user = User.objects.create_user(
            email="apiuser@example.com",
            password="testpassword123",
            user_identity=self.identity,
        )

        # Assign Admin role via Profile
        self.admin_role, _ = Role.objects.get_or_create(name="ADMIN")
        self.profile = Profile.objects.create(user=self.identity, role=self.admin_role)

        # Generate JWT
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

    def test_list_users(self):
        """Test listing users"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get("/api/users/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

    def test_get_user_detail(self):
        """Test getting user detail"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        # Identify via ID of Identity, not Auth, because ViewSet queryset returns UserIdentities
        response = self.client.get(f"/api/users/{self.identity.id_user}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "apiuser@example.com")
        # UUID vs string comparison
        self.assertEqual(str(response.data["id_user"]), str(self.identity.id_user))

    def test_update_user(self):
        """Test updating user"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "phone_number": "+33612345678",
        }

        # Patch against the ME endpoint or specific ID?
        # Let's try ME endpoint as it's safer/more common
        response = self.client.patch("/api/users/me/", update_data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.identity.refresh_from_db()
        self.assertEqual(self.identity.first_name, "Updated")
        self.assertEqual(self.identity.phone_number, "+33612345678")
