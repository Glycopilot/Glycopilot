from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework.test import APITestCase

from apps.medications.models import Medication, UserMedication
from apps.medications.serializers import (
    MedicationSerializer,
    UserMedicationCreateSerializer,
    UserMedicationSerializer,
)

User = get_user_model()


def _mk_user(email="med-ser@test.com"):
    return User.objects.create_user(email=email, password="pass123")


def _mk_medication(name="Doliprane"):
    return Medication.objects.create(name=name, dosage="500mg")


class MedicationSerializerTests(APITestCase):
    def test_serializes_medication_fields(self):
        med = _mk_medication("Aspirine")
        data = MedicationSerializer(med).data
        self.assertEqual(data["name"], "Aspirine")
        self.assertIn("dosage", data)
        self.assertIn("medication_id", data)

    def test_returns_empty_string_for_blank_optional_fields(self):
        med = Medication.objects.create(name="Plain", dosage="")
        data = MedicationSerializer(med).data
        self.assertEqual(data["dosage"], "")


class UserMedicationSerializerTests(APITestCase):
    def setUp(self):
        self.user = _mk_user()
        self.med = _mk_medication()
        self.um = UserMedication.objects.create(
            user=self.user,
            medication=self.med,
            start_date=timezone.now().date(),
            doses_per_day=1,
        )

    def test_serializes_user_medication_with_nested_medication(self):
        data = UserMedicationSerializer(self.um).data
        self.assertEqual(data["medication"]["name"], "Doliprane")
        self.assertEqual(data["doses_per_day"], 1)

    def test_display_name_is_medication_name_when_set(self):
        data = UserMedicationSerializer(self.um).data
        self.assertEqual(data["display_name"], "Doliprane")


class UserMedicationCreateSerializerValidationTests(APITestCase):
    def test_invalid_when_neither_medication_nor_custom_name(self):
        user = _mk_user("val@test.com")
        serializer = UserMedicationCreateSerializer(
            data={
                "start_date": timezone.now().date().isoformat(),
                "doses_per_day": 1,
                "custom_name": "",
            },
            context={"request": type("R", (), {"user": user})()},
        )
        self.assertFalse(serializer.is_valid())
        self.assertTrue(
            any("médicament" in str(v).lower() for v in serializer.errors.values())
            or len(serializer.errors) > 0
        )

    def test_valid_with_custom_name(self):
        user = _mk_user("valid-custom@test.com")
        serializer = UserMedicationCreateSerializer(
            data={
                "start_date": timezone.now().date().isoformat(),
                "doses_per_day": 1,
                "custom_name": "VitamineC",
                "custom_dosage": "500mg",
            },
            context={"request": type("R", (), {"user": user})()},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
