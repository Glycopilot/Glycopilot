from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.medications.models import (
    IntakeStatus,
    Medication,
    MedicationIntake,
    MedicationSchedule,
    UserMedication,
)

User = get_user_model()


def _mk_user(email="med-api@test.com"):
    return User.objects.create_user(email=email, password="pass123")


def _mk_medication(name="Metformin"):
    return Medication.objects.create(name=name, dosage="500mg")


def _mk_user_medication(user, med):
    return UserMedication.objects.create(
        user=user,
        medication=med,
        start_date=timezone.now().date(),
        doses_per_day=1,
    )


class MedicationReferenceViewTests(APITestCase):
    def setUp(self):
        self.user = _mk_user()
        self.client.force_authenticate(user=self.user)
        self.med = _mk_medication("Doliprane")

    def test_list_medications_returns_200(self):
        response = self.client.get("/api/medications/reference/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_medications_contains_created(self):
        response = self.client.get("/api/medications/reference/")
        names = [m["name"] for m in response.data]
        self.assertIn("Doliprane", names)

    def test_search_filters_by_name(self):
        _mk_medication("Aspirine")
        response = self.client.get("/api/medications/reference/?q=Doli")
        names = [m["name"] for m in response.data]
        self.assertIn("Doliprane", names)
        self.assertNotIn("Aspirine", names)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/medications/reference/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserMedicationViewTests(APITestCase):
    def setUp(self):
        self.user = _mk_user("user-med@test.com")
        self.other = _mk_user("other-med@test.com")
        self.client.force_authenticate(user=self.user)
        self.med = _mk_medication("Metformin")

    def test_create_user_medication(self):
        payload = {
            "medication_id": self.med.medication_id,
            "start_date": timezone.now().date().isoformat(),
            "doses_per_day": 2,
        }
        response = self.client.post("/api/medications/log/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(UserMedication.objects.filter(user=self.user, medication=self.med).exists())

    def test_list_returns_only_own_medications(self):
        _mk_user_medication(self.user, self.med)
        _mk_user_medication(self.other, self.med)

        response = self.client.get("/api/medications/log/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_delete_own_medication(self):
        um = _mk_user_medication(self.user, self.med)
        response = self.client.delete(f"/api/medications/log/{um.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserMedication.objects.filter(pk=um.pk).exists())

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/medications/log/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MedicationIntakeViewTests(APITestCase):
    def setUp(self):
        self.user = _mk_user("intake-api@test.com")
        self.client.force_authenticate(user=self.user)
        self.med = _mk_medication("Aspirin")
        self.um = _mk_user_medication(self.user, self.med)
        self.schedule = MedicationSchedule.objects.create(
            user_medication=self.um,
            time="08:00:00",
            reminder_enabled=True,
        )
        self.intake = MedicationIntake.objects.create(
            user_medication=self.um,
            schedule=self.schedule,
            scheduled_date=timezone.now().date(),
            scheduled_time="08:00:00",
            status=IntakeStatus.PENDING,
        )

    def test_list_intakes_returns_200(self):
        response = self.client.get("/api/medications/intakes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_mark_intake_as_taken(self):
        response = self.client.post(
            f"/api/medications/intakes/{self.intake.id}/action/",
            {"action": "taken"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.intake.refresh_from_db()
        self.assertEqual(self.intake.status, IntakeStatus.TAKEN)
        self.assertIsNotNone(self.intake.taken_at)

    def test_mark_intake_as_missed(self):
        response = self.client.post(
            f"/api/medications/intakes/{self.intake.id}/action/",
            {"action": "missed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.intake.refresh_from_db()
        self.assertEqual(self.intake.status, IntakeStatus.MISSED)

    def test_mark_intake_as_snoozed(self):
        snoozed_until = (timezone.now() + timezone.timedelta(minutes=30)).isoformat()
        response = self.client.post(
            f"/api/medications/intakes/{self.intake.id}/action/",
            {"action": "snoozed", "snoozed_until": snoozed_until},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.intake.refresh_from_db()
        self.assertEqual(self.intake.status, IntakeStatus.SNOOZED)

    def test_history_excludes_pending(self):
        taken_intake = MedicationIntake.objects.create(
            user_medication=self.um,
            schedule=self.schedule,
            scheduled_date=timezone.now().date(),
            scheduled_time="12:00:00",
            status=IntakeStatus.TAKEN,
        )
        response = self.client.get("/api/medications/intakes/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [i["id"] for i in response.data]
        self.assertIn(taken_intake.id, ids)
        self.assertNotIn(self.intake.id, ids)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/medications/intakes/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
