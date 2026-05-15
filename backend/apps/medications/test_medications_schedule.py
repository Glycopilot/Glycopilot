from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.medications.models import (
    Medication,
    MedicationIntake,
    MedicationSchedule,
    UserMedication,
    IntakeStatus,
)

User = get_user_model()


def _mk_user(email="sched-api@test.com"):
    return User.objects.create_user(email=email, password="pass123")


def _mk_med(name="Doliprane"):
    return Medication.objects.create(name=name, dosage="1g")


def _mk_user_med(user, med):
    return UserMedication.objects.create(
        user=user, medication=med, start_date=timezone.now().date(), doses_per_day=1
    )


class MedicationScheduleViewSetTests(APITestCase):
    def setUp(self):
        self.user = _mk_user()
        self.client.force_authenticate(user=self.user)
        self.med = _mk_med()
        self.um = _mk_user_med(self.user, self.med)

    def test_create_schedule(self):
        payload = {
            "medication_id": self.um.id,
            "time": "08:00:00",
            "reminder_enabled": True,
        }
        response = self.client.post("/api/medications/schedules/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            MedicationSchedule.objects.filter(user_medication=self.um, time="08:00:00").exists()
        )

    def test_list_schedules_for_current_user(self):
        MedicationSchedule.objects.create(user_medication=self.um, time="09:00:00", reminder_enabled=True)
        response = self.client.get("/api/medications/schedules/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_filter_schedules_by_medication_id(self):
        other_med = _mk_med("Metformin")
        other_um = _mk_user_med(self.user, other_med)
        MedicationSchedule.objects.create(user_medication=self.um, time="08:00:00", reminder_enabled=True)
        MedicationSchedule.objects.create(user_medication=other_um, time="10:00:00", reminder_enabled=False)

        response = self.client.get(f"/api/medications/schedules/?medication_id={self.um.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/medications/schedules/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MedicationTodayEndpointTests(APITestCase):
    def setUp(self):
        self.user = _mk_user("today-api@test.com")
        self.client.force_authenticate(user=self.user)

    def test_today_returns_200_with_no_medications(self):
        response = self.client.get("/api/medications/log/today/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_today_returns_intakes_for_active_medications(self):
        med = _mk_med("Active Med")
        um = UserMedication.objects.create(
            user=self.user, medication=med, start_date=timezone.now().date(), doses_per_day=1, statut=True
        )
        schedule = MedicationSchedule.objects.create(
            user_medication=um, time="08:00:00", reminder_enabled=True
        )
        response = self.client.get("/api/medications/log/today/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Intake should have been created
        self.assertTrue(
            MedicationIntake.objects.filter(user_medication=um, scheduled_time="08:00:00").exists()
        )
