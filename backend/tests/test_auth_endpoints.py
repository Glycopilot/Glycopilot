"""
Tests pour les endpoints d'authentification JWT
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from models.user import User


class AuthRegistrationTest(TestCase):
    """
    Tests pour l'endpoint /api/auth/register
    """

    def setUp(self):
        """Setup des données de test"""
        self.client = APIClient()
        self.register_url = reverse("register")
        self.valid_user_data = {
            "email": "newuser@example.com",
            "first_name": "New",
            "last_name": "User",
            "password": "securepassword123",
            "password_confirm": "securepassword123",
        }

    def test_register_user_success(self):
        """Test d'inscription réussie d'un nouvel utilisateur"""
        response = self.client.post(
            self.register_url, self.valid_user_data, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "newuser@example.com")
        self.assertEqual(response.data["user"]["first_name"], "New")
        self.assertEqual(response.data["user"]["last_name"], "User")

        # Vérifier que l'utilisateur a été créé dans la DB
        self.assertTrue(User.objects.filter(email="newuser@example.com").exists())

    def test_register_duplicate_email(self):
        """Test d'inscription avec un email déjà existant"""
        # Créer un premier utilisateur
        User.objects.create_user(
            email="existing@example.com",
            password="password123",
            first_name="Existing",
            last_name="User",
        )

        # Tenter de créer un utilisateur avec le même email
        duplicate_data = {
            "email": "existing@example.com",
            "first_name": "Another",
            "last_name": "User",
            "password": "password123",
            "password_confirm": "password123",
        }

        response = self.client.post(self.register_url, duplicate_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_password_mismatch(self):
        """Test d'inscription avec des mots de passe non correspondants"""
        invalid_data = self.valid_user_data.copy()
        invalid_data["password_confirm"] = "differentpassword"

        response = self.client.post(self.register_url, invalid_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data)

    def test_register_short_password(self):
        """Test d'inscription avec un mot de passe trop court"""
        invalid_data = self.valid_user_data.copy()
        invalid_data["password"] = "short"
        invalid_data["password_confirm"] = "short"

        response = self.client.post(self.register_url, invalid_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_register_missing_fields(self):
        """Test d'inscription avec des champs manquants"""
        incomplete_data = {
            "email": "incomplete@example.com",
            "password": "password123",
        }

        response = self.client.post(self.register_url, incomplete_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_email_normalization(self):
        """Test que l'email est normalisé en minuscules"""
        data = self.valid_user_data.copy()
        data["email"] = "UPPERCASE@EXAMPLE.COM"

        response = self.client.post(self.register_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["email"], "uppercase@example.com")


class AuthLoginTest(TestCase):
    """
    Tests pour l'endpoint /api/auth/login
    """

    def setUp(self):
        """Setup des données de test"""
        self.client = APIClient()
        self.login_url = reverse("login")

        # Créer un utilisateur de test
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpassword123",
            first_name="Test",
            last_name="User",
        )

    def test_login_success(self):
        """Test de connexion réussie"""
        login_data = {
            "email": "testuser@example.com",
            "password": "testpassword123",
        }

        response = self.client.post(self.login_url, login_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "testuser@example.com")

    def test_login_wrong_password(self):
        """Test de connexion avec un mauvais mot de passe"""
        login_data = {
            "email": "testuser@example.com",
            "password": "wrongpassword",
        }

        response = self.client.post(self.login_url, login_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_login_nonexistent_user(self):
        """Test de connexion avec un email inexistant"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123",
        }

        response = self.client.post(self.login_url, login_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_login_inactive_user(self):
        """Test de connexion avec un compte désactivé"""
        # Désactiver l'utilisateur
        self.user.is_active = False
        self.user.save()

        login_data = {
            "email": "testuser@example.com",
            "password": "testpassword123",
        }

        response = self.client.post(self.login_url, login_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_login_case_insensitive_email(self):
        """Test que le login fonctionne avec différentes casses d'email"""
        login_data = {
            "email": "TESTUSER@EXAMPLE.COM",
            "password": "testpassword123",
        }

        response = self.client.post(self.login_url, login_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_missing_credentials(self):
        """Test de connexion avec des identifiants manquants"""
        response = self.client.post(self.login_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AuthMeTest(TestCase):
    """
    Tests pour l'endpoint /api/auth/me
    """

    def setUp(self):
        """Setup des données de test"""
        self.client = APIClient()
        self.me_url = reverse("me")

        # Créer un utilisateur de test
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpassword123",
            first_name="Test",
            last_name="User",
        )

        # Générer un token JWT
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

    def test_me_success_with_valid_token(self):
        """Test de récupération des infos utilisateur avec un token valide"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "testuser@example.com")
        self.assertEqual(response.data["first_name"], "Test")
        self.assertEqual(response.data["last_name"], "User")
        self.assertIn("id", response.data)
        self.assertIn("created_at", response.data)

    def test_me_without_token(self):
        """Test de l'endpoint /me sans token"""
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_with_invalid_token(self):
        """Test de l'endpoint /me avec un token invalide"""
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid_token")
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_with_malformed_header(self):
        """Test de l'endpoint /me avec un header malformé"""
        self.client.credentials(HTTP_AUTHORIZATION="InvalidFormat")
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AuthRefreshTokenTest(TestCase):
    """
    Tests pour l'endpoint /api/auth/refresh
    """

    def setUp(self):
        """Setup des données de test"""
        self.client = APIClient()
        self.refresh_url = reverse("refresh_token")

        # Créer un utilisateur de test
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpassword123",
            first_name="Test",
            last_name="User",
        )

        # Générer un token JWT
        refresh = RefreshToken.for_user(self.user)
        self.refresh_token = str(refresh)

    def test_refresh_token_success(self):
        """Test de rafraîchissement du token avec un refresh token valide"""
        refresh_data = {"refresh": self.refresh_token}

        response = self.client.post(self.refresh_url, refresh_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        # Le nouveau access token doit être différent
        self.assertIsNotNone(response.data["access"])

    def test_refresh_token_invalid(self):
        """Test de rafraîchissement avec un token invalide"""
        refresh_data = {"refresh": "invalid_refresh_token"}

        response = self.client.post(self.refresh_url, refresh_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", response.data)

    def test_refresh_token_missing(self):
        """Test de rafraîchissement sans fournir de token"""
        response = self.client.post(self.refresh_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("refresh", response.data)


class AuthLogoutTest(TestCase):
    """
    Tests pour l'endpoint /api/auth/logout
    """

    def setUp(self):
        """Setup des données de test"""
        self.client = APIClient()
        self.logout_url = reverse("logout")

        # Créer un utilisateur de test
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpassword123",
            first_name="Test",
            last_name="User",
        )

        # Générer des tokens JWT
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.refresh_token = str(refresh)

    def test_logout_success(self):
        """Test de déconnexion réussie"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        logout_data = {"refresh": self.refresh_token}

        response = self.client.post(self.logout_url, logout_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Déconnexion réussie.")

    def test_logout_blacklists_token(self):
        """Test que le logout blacklist le refresh token"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        logout_data = {"refresh": self.refresh_token}

        # Déconnexion
        response = self.client.post(self.logout_url, logout_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Tenter de réutiliser le refresh token
        refresh_url = reverse("refresh_token")
        refresh_data = {"refresh": self.refresh_token}
        response = self.client.post(refresh_url, refresh_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_token(self):
        """Test de déconnexion sans fournir de refresh token"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.post(self.logout_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("refresh", response.data)

    def test_logout_with_invalid_token(self):
        """Test de déconnexion avec un token invalide"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        logout_data = {"refresh": "invalid_token"}

        response = self.client.post(self.logout_url, logout_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_logout_without_authentication(self):
        """Test de déconnexion sans être authentifié"""
        logout_data = {"refresh": self.refresh_token}
        response = self.client.post(self.logout_url, logout_data, format="json")

        # L'endpoint logout nécessite une authentification
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
