"""
Tests pour le modèle User
"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class UserModelTest(TestCase):
    """
    Tests pour le modèle User
    """

    def setUp(self):
        """Setup des données de test"""
        self.user_data = {
            "username": "testuser",
            "email": "testuser@example.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "testpassword123",
        }

    def test_create_user(self):
        """Test de création d'un utilisateur"""
        user = User.objects.create_user(**self.user_data)

        self.assertIsNotNone(user.id)
        self.assertEqual(user.email, "testuser@example.com")
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.first_name, "Test")
        self.assertEqual(user.last_name, "User")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.role, User.Role.PATIENT)

    def test_create_superuser(self):
        """Test de création d'un superutilisateur"""
        user = User.objects.create_superuser(**self.user_data)

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, User.Role.ADMIN)

    def test_user_str_representation(self):
        """Test de la représentation string du modèle"""
        user = User.objects.create_user(**self.user_data)

        expected_str = f"{user.get_full_name()} ({user.email})"
        self.assertEqual(str(user), expected_str)

    def test_user_email_unique(self):
        """Test que l'email doit être unique"""
        User.objects.create_user(**self.user_data)

        # Tenter de créer un autre utilisateur avec le même email
        duplicate_data = self.user_data.copy()
        duplicate_data["username"] = "anotheruser"

        with self.assertRaises(Exception):
            User.objects.create_user(**duplicate_data)

    def test_user_optional_fields(self):
        """Test des champs optionnels du modèle User"""
        user = User.objects.create_user(
            username="optionaluser",
            email="optional@example.com",
            password="password123",
            phone_number="+33612345678",
            birth_date="1990-01-15",
            address="123 Main St",
            medical_comment="Test comment",
        )

        self.assertEqual(user.phone_number, "+33612345678")
        self.assertEqual(str(user.birth_date), "1990-01-15")
        self.assertEqual(user.address, "123 Main St")
        self.assertEqual(user.medical_comment, "Test comment")
        self.assertTrue(user.actif)
        self.assertEqual(user.role, User.Role.PATIENT)


class UserAPITest(TestCase):
    """
    Tests pour les endpoints API des users
    """

    def setUp(self):
        """Setup des données de test"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="apiuser",
            email="apiuser@example.com",
            password="testpassword123",
            first_name="API",
            last_name="User",
            role=User.Role.ADMIN,
        )

        # Générer un token JWT
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

    def test_list_users(self):
        """Test de liste des utilisateurs"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get("/api/users/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # DRF avec pagination retourne un dict avec 'results'
        self.assertIn("results", response.data)
        self.assertIsInstance(response.data["results"], list)
        self.assertGreater(len(response.data["results"]), 0)
        self.assertIn("role", response.data["results"][0])

    def test_get_user_detail(self):
        """Test de récupération d'un utilisateur"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get(f"/api/users/{self.user.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "apiuser@example.com")
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["role"], User.Role.ADMIN)

    def test_update_user(self):
        """Test de mise à jour d'un utilisateur"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "phone_number": "+33612345678",
        }

        response = self.client.patch(f"/api/users/{self.user.id}/", update_data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Updated")
        self.assertEqual(self.user.last_name, "Name")
        self.assertEqual(self.user.phone_number, "+33612345678")

    def test_delete_user(self):
        """Test de suppression d'un utilisateur"""
        user_to_delete = User.objects.create_user(
            username="todelete",
            email="todelete@example.com",
            password="password123",
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.delete(f"/api/users/{user_to_delete.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=user_to_delete.id).exists())

    def test_list_users_requires_auth(self):
        """Test que la liste des users nécessite une authentification"""
        response = self.client.get("/api/users/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_user_requires_auth(self):
        """Test que la récupération d'un user nécessite une authentification"""
        response = self.client.get(f"/api/users/{self.user.id}/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
