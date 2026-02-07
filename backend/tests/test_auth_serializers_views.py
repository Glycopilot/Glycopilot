import pytest
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.auth.serializers import (
    AuthResponseSerializer,
    CreateAdminAccountSerializer,
    LoginSerializer,
    RegisterSerializer,
)
from apps.doctors.models import VerificationStatus
from apps.profiles.models import Profile, Role
from apps.users.models import AuthAccount, User


class AuthSerializersViewsCoverageTests(TestCase):
    def setUp(self):
        self.patient_role = Role.objects.create(name="PATIENT")
        self.doctor_role = Role.objects.create(name="DOCTOR")
        self.admin_role = Role.objects.create(name="ADMIN")
        VerificationStatus.objects.get_or_create(label="PENDING")
        VerificationStatus.objects.get_or_create(label="VERIFIED")

    def test_register_serializer_validation(self):
        AuthAccount.objects.create_user(email="dup@test.com", password="pass123")
        serializer = RegisterSerializer(
            data={
                "email": "dup@test.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "first_name": "A",
                "last_name": "B",
                "role": "PATIENT",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)
        with pytest.raises(Exception):
            RegisterSerializer().validate_email("dup@test.com")

        serializer = RegisterSerializer(
            data={
                "email": "new@test.com",
                "password": "StrongPass123!",
                "password_confirm": "DifferentPass123!",
                "first_name": "A",
                "last_name": "B",
                "role": "PATIENT",
            }
        )
        self.assertFalse(serializer.is_valid())

        serializer = RegisterSerializer(
            data={
                "email": "badrole@test.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "first_name": "A",
                "last_name": "B",
                "role": "ADMIN",
            }
        )
        self.assertFalse(serializer.is_valid())

        Role.objects.filter(name="PATIENT").delete()
        serializer = RegisterSerializer(
            data={
                "email": "missingrole@test.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "first_name": "A",
                "last_name": "B",
                "role": "PATIENT",
            }
        )
        self.assertFalse(serializer.is_valid())

    def test_register_serializer_doctor_fields(self):
        serializer = RegisterSerializer(
            data={
                "email": "doc@test.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "first_name": "Doc",
                "last_name": "Test",
                "role": "DOCTOR",
                "license_number": "LIC-1",
                "specialty": "Cardio",
                "medical_center_address": "Center",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        account = serializer.save()
        self.assertEqual(account.email, "doc@test.com")

        from unittest.mock import patch
        from apps.doctors.models import DoctorProfile

        serializer = RegisterSerializer(
            data={
                "email": "doc2@test.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "first_name": "Doc",
                "last_name": "Test",
                "role": "DOCTOR",
                "license_number": "LIC-2",
                "specialty": "Cardio",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with patch(
            "apps.doctors.models.DoctorProfile.objects.get",
            side_effect=DoctorProfile.DoesNotExist,
        ):
            serializer.save()

    def test_create_admin_serializer_validation(self):
        serializer = CreateAdminAccountSerializer(
            data={
                "email": "Admin@Test.com",
                "first_name": "Admin",
                "last_name": "User",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "account_type": "ADMIN",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        serializer = CreateAdminAccountSerializer(
            data={
                "email": "mismatch@test.com",
                "first_name": "Admin",
                "last_name": "User",
                "password": "StrongPass123!",
                "password_confirm": "DifferentPass123!",
                "account_type": "ADMIN",
            }
        )
        self.assertFalse(serializer.is_valid())

        AuthAccount.objects.create_user(email="admin@test.com", password="pass123")
        serializer = CreateAdminAccountSerializer(
            data={
                "email": "admin@test.com",
                "first_name": "Admin",
                "last_name": "User",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "account_type": "ADMIN",
            }
        )
        self.assertFalse(serializer.is_valid())

    def test_login_serializer_errors(self):
        serializer = LoginSerializer(data={"email": "missing@test.com", "password": "x"})
        self.assertFalse(serializer.is_valid())

        identity = User.objects.create(first_name="Inactive", last_name="User")
        account = AuthAccount.objects.create_user(
            email="inactive@test.com", password="pass123", user_identity=identity
        )
        account.is_active = False
        account.save()
        serializer = LoginSerializer(
            data={"email": "inactive@test.com", "password": "pass123"}
        )
        self.assertFalse(serializer.is_valid())

        active = AuthAccount.objects.create_user(
            email="active@test.com", password="pass123"
        )
        serializer = LoginSerializer(
            data={"email": "active@test.com", "password": "wrongpass"}
        )
        self.assertFalse(serializer.is_valid())

    @override_settings(SECRET_KEY_ADMIN="admin-secret")
    def test_auth_response_serializer_admin_tokens(self):
        identity = User.objects.create(first_name="Admin", last_name="User")
        account = AuthAccount.objects.create_user(
            email="admin2@test.com", password="pass123", user_identity=identity
        )
        Profile.objects.create(user=identity, role=self.admin_role)
        data = AuthResponseSerializer.get_tokens_for_user(account)
        self.assertIn("access", data)
        self.assertIn("refresh", data)

    def test_refresh_logout_create_admin_me(self):
        identity = User.objects.create(first_name="Jane", last_name="Doe")
        account = AuthAccount.objects.create_user(
            email="jane2@test.com", password="pass123", user_identity=identity
        )
        Profile.objects.create(user=identity, role=self.patient_role)

        client = APIClient()
        login = client.post(
            reverse("login"), {"email": "jane2@test.com", "password": "pass123"}
        )
        refresh_token = login.data["refresh"]

        refresh = client.post(reverse("refresh_token"), {"refresh": refresh_token})
        self.assertEqual(refresh.status_code, status.HTTP_200_OK)

        client.force_authenticate(user=account)
        me = client.get(reverse("me"))
        self.assertEqual(me.status_code, status.HTTP_200_OK)

        from rest_framework_simplejwt.tokens import RefreshToken

        # superadmin create admin
        super_identity = User.objects.create(first_name="Super", last_name="Admin")
        super_user = AuthAccount.objects.create_user(
            email="super@test.com",
            password="pass123",
            user_identity=super_identity,
            is_staff=True,
            is_superuser=True,
        )
        client.force_authenticate(user=super_user)
        response = client.post(
            reverse("create_admin_account"),
            {
                "email": "admin_created@test.com",
                "first_name": "Admin",
                "last_name": "User",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "account_type": "ADMIN",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = client.post(
            reverse("create_admin_account"),
            {"email": "bad@example.com", "account_type": "ADMIN"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        client.force_authenticate(user=account)
        logout_missing = client.post(reverse("logout"), {})
        self.assertEqual(logout_missing.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(DEBUG=True)
    def test_email_smtp_debug(self):
        from unittest.mock import patch
        from apps.auth.email_smtp import send_reset_password_email

        with patch("apps.auth.email_smtp.send_mail", return_value=1) as mocked:
            send_reset_password_email("debug@test.com", "http://link")
            mocked.assert_called_once()

    def test_logout_token_mismatch_and_invalid(self):
        from types import SimpleNamespace
        from unittest.mock import Mock, patch
        from apps.auth import views

        user = SimpleNamespace(id="user-id", role="patient", is_authenticated=True)
        view = views.logout.cls()

        fake_token = Mock()
        fake_token.payload = {"user_id": "other-id"}
        fake_token.blacklist = Mock()
        with patch("apps.auth.views.RefreshToken", return_value=fake_token):
            request = SimpleNamespace(user=user, data={"refresh": "token"})
            response = view.post(request)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        fake_token.payload = {"user_id": "user-id"}
        with patch("apps.auth.views.RefreshToken", return_value=fake_token):
            request = SimpleNamespace(user=user, data={"refresh": "token"})
            response = view.post(request)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        with patch("apps.auth.views.RefreshToken", side_effect=Exception("bad")):
            request = SimpleNamespace(user=user, data={"refresh": "token"})
            response = view.post(request)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
