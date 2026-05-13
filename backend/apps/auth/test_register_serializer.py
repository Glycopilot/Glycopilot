from django.test import TestCase

from apps.auth.serializers import RegisterSerializer
from apps.profiles.models import Role


def _ensure_roles():
    for name in ("PATIENT", "DOCTOR", "FAMILY", "SUPERADMIN"):
        Role.objects.get_or_create(name=name)


class RegisterSerializerValidationTests(TestCase):
    def setUp(self):
        _ensure_roles()

    def _base_payload(self, **overrides):
        data = {
            "email": "new@test.com",
            "first_name": "Alice",
            "last_name": "Test",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "role": "PATIENT",
        }
        data.update(overrides)
        return data

    def test_valid_patient_registration(self):
        serializer = RegisterSerializer(data=self._base_payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_mismatched_passwords(self):
        serializer = RegisterSerializer(
            data=self._base_payload(password_confirm="WrongPass456!")
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("password_confirm", str(serializer.errors))

    def test_duplicate_email_rejected(self):
        serializer = RegisterSerializer(data=self._base_payload())
        serializer.is_valid()
        serializer.save()

        serializer2 = RegisterSerializer(
            data=self._base_payload(email="new@test.com")
        )
        self.assertFalse(serializer2.is_valid())
        self.assertIn("email", serializer2.errors)

    def test_invalid_role_rejected(self):
        serializer = RegisterSerializer(data=self._base_payload(role="SUPERADMIN"))
        self.assertFalse(serializer.is_valid())
        self.assertIn("role", serializer.errors)

    def test_doctor_without_license_rejected(self):
        serializer = RegisterSerializer(
            data=self._base_payload(role="DOCTOR", license_number="")
        )
        self.assertFalse(serializer.is_valid())

    def test_doctor_with_license_valid(self):
        serializer = RegisterSerializer(
            data=self._base_payload(
                email="doc@test.com",
                role="DOCTOR",
                license_number="12345678901",
                specialty="General",
                medical_center_address="1 rue Test",
            )
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_email_is_lowercased(self):
        serializer = RegisterSerializer(
            data=self._base_payload(email="UPPER@TEST.COM")
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["email"], "upper@test.com")
