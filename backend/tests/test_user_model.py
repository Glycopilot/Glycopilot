# Tests for User model
from django.test import TestCase

from models.user import User


class UserModelTest(TestCase):
    """
    Tests pour le modèle User
    """

    def setUp(self):
        """Setup des données de test"""
        self.user_data = {
            "email": "test@example.com",
            "first_name": "John",
            "last_name": "Doe",
        }

    def test_create_user(self):
        """Test de création d'un utilisateur"""
        user = User.objects.create(**self.user_data)
        self.assertEqual(user.email, "test@example.com")
        self.assertEqual(user.first_name, "John")
        self.assertEqual(user.last_name, "Doe")
        self.assertTrue(user.is_active)

    def test_user_str_representation(self):
        """Test de la représentation string"""
        user = User.objects.create(**self.user_data)
        expected = "John Doe (test@example.com)"
        self.assertEqual(str(user), expected)

    def test_user_unique_email(self):
        """Test de l'unicité de l'email"""
        User.objects.create(**self.user_data)

        with self.assertRaises(Exception):
            User.objects.create(**self.user_data)
