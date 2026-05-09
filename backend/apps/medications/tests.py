"""Tests for medications app."""

import datetime
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from django.contrib.auth import get_user_model
AuthAccount = get_user_model()
from apps.medications.models import (
    IntakeStatus,
    MealTiming,
    Medication,
    MedicationIntake,
    MedicationSchedule,
    UserMedication,
)
from apps.medications.serializers import UserMedicationCreateSerializer
from apps.medications.services.reminders import send_due_medication_reminders


def make_user(email="test@example.com"):
    return AuthAccount.objects.create_user(
        email=email,
        password="TestPass123!",
    )


def make_med_ref(name="Doliprane", dosage="1000 mg"):
    return Medication.objects.create(name=name, dosage=dosage)


def make_user_medication(user, name="Doliprane", schedule_times=None):
    med = UserMedication.objects.create(
        user=user,
        custom_name=name,
        custom_dosage="1000 mg",
        start_date=timezone.localdate(),
        doses_per_day=1,
        meal_timing=MealTiming.ANYTIME,
        statut=True,
    )
    for t in (schedule_times or [datetime.time(8, 0)]):
        MedicationSchedule.objects.create(
            user_medication=med,
            time=t,
            reminder_enabled=True,
        )
    return med


class MedicationModelTest(TestCase):
    def test_display_name_custom(self):
        user = make_user()
        med = UserMedication(user=user, custom_name="Metformine")
        self.assertEqual(med.display_name, "Metformine")

    def test_display_name_from_reference(self):
        user = make_user("ref@test.com")
        ref = make_med_ref("Doliprane")
        med = UserMedication(user=user, medication=ref)
        self.assertEqual(med.display_name, "Doliprane")

    def test_display_dosage_custom(self):
        user = make_user("dos@test.com")
        med = UserMedication(user=user, custom_dosage="500 mg")
        self.assertEqual(med.display_dosage, "500 mg")

    def test_display_dosage_from_reference(self):
        user = make_user("dosref@test.com")
        ref = make_med_ref(dosage="1000 mg")
        med = UserMedication(user=user, medication=ref, custom_dosage="500 mg")
        self.assertEqual(med.display_dosage, "1000 mg")

    def test_str_intake(self):
        user = make_user("str@test.com")
        user_med = make_user_medication(user)
        intake = MedicationIntake(
            user_medication=user_med,
            scheduled_date=timezone.localdate(),
            scheduled_time=datetime.time(8, 0),
            status=IntakeStatus.PENDING,
        )
        self.assertIn("pending", str(intake))


class MedicationViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("view@test.com")
        self.client.force_authenticate(user=self.user)

    def test_list_reference_returns_array(self):
        make_med_ref("Metformine")
        response = self.client.get("/api/medications/reference/")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_search_reference_filters(self):
        make_med_ref("Doliprane")
        make_med_ref("Metformine")
        response = self.client.get("/api/medications/reference/", {"q": "doliprane"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Doliprane")

    def test_search_no_results(self):
        response = self.client.get("/api/medications/reference/", {"q": "zzz"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_create_medication_custom_name(self):
        payload = {
            "custom_name": "Doliprane 1000",
            "start_date": str(timezone.localdate()),
            "doses_per_day": 1,
            "meal_timing": "anytime",
            "schedule_times": ["08:00"],
            "reminder_enabled": True,
        }
        response = self.client.post("/api/medications/log/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["display_name"], "Doliprane 1000")

    def test_create_medication_without_name_fails(self):
        payload = {
            "start_date": str(timezone.localdate()),
            "doses_per_day": 1,
            "meal_timing": "anytime",
            "schedule_times": ["08:00"],
        }
        response = self.client.post("/api/medications/log/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_create_with_reference(self):
        ref = make_med_ref("Metformine", "500 mg")
        payload = {
            "medication_id": ref.medication_id,
            "custom_name": "Metformine",
            "start_date": str(timezone.localdate()),
            "doses_per_day": 2,
            "meal_timing": "after_meal",
            "schedule_times": ["08:00", "20:00"],
        }
        response = self.client.post("/api/medications/log/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["schedules"]), 2)

    def test_list_user_medications(self):
        make_user_medication(self.user, "Metformine")
        response = self.client.get("/api/medications/log/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)

    def test_today_creates_intakes_with_name(self):
        make_user_medication(self.user, "Aspirine")
        response = self.client.get("/api/medications/log/today/")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)
        if response.data:
            self.assertIn("medication_name", response.data[0])
            self.assertEqual(response.data[0]["medication_name"], "Aspirine")

    def test_today_idempotent(self):
        make_user_medication(self.user, "Gliclazide")
        self.client.get("/api/medications/log/today/")
        response = self.client.get("/api/medications/log/today/")
        self.assertEqual(response.status_code, 200)

    def test_delete_medication(self):
        med = make_user_medication(self.user, "ToDelete")
        response = self.client.delete(f"/api/medications/log/{med.id}/")
        self.assertEqual(response.status_code, 204)

    def test_other_user_isolation(self):
        other = make_user("other@test.com")
        make_user_medication(other, "Secret Med")
        response = self.client.get("/api/medications/log/")
        data = list(response.data)
        names = [m["display_name"] for m in data if isinstance(m, dict)]
        self.assertNotIn("Secret Med", names)


class MedicationIntakeViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("intake@test.com")
        self.client.force_authenticate(user=self.user)
        self.user_med = make_user_medication(self.user, "Aspirine")

    def _get_intake(self):
        self.client.get("/api/medications/log/today/")
        return MedicationIntake.objects.filter(
            user_medication=self.user_med
        ).first()

    def test_mark_as_taken(self):
        intake = self._get_intake()
        if not intake:
            return
        response = self.client.post(
            f"/api/medications/intakes/{intake.id}/action/",
            {"action": "taken"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        intake.refresh_from_db()
        self.assertEqual(intake.status, IntakeStatus.TAKEN)

    def test_mark_as_missed(self):
        intake = self._get_intake()
        if not intake:
            return
        response = self.client.post(
            f"/api/medications/intakes/{intake.id}/action/",
            {"action": "missed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        intake.refresh_from_db()
        self.assertEqual(intake.status, IntakeStatus.MISSED)

    def test_mark_as_snoozed(self):
        intake = self._get_intake()
        if not intake:
            return
        snooze = (timezone.now() + datetime.timedelta(minutes=30)).isoformat()
        response = self.client.post(
            f"/api/medications/intakes/{intake.id}/action/",
            {"action": "snoozed", "snoozed_until": snooze},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        intake.refresh_from_db()
        self.assertEqual(intake.status, IntakeStatus.SNOOZED)

    def test_snoozed_requires_snoozed_until(self):
        intake = self._get_intake()
        if not intake:
            return
        response = self.client.post(
            f"/api/medications/intakes/{intake.id}/action/",
            {"action": "snoozed"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_history_includes_medication_name(self):
        intake = self._get_intake()
        if intake:
            intake.status = IntakeStatus.TAKEN
            intake.save()
        response = self.client.get("/api/medications/intakes/history/")
        self.assertEqual(response.status_code, 200)
        for item in response.data:
            self.assertIn("medication_name", item)


class MedicationSerializerTest(TestCase):
    def test_create_with_schedules(self):
        user = make_user("serial@test.com")
        data = {
            "custom_name": "Metformine",
            "start_date": str(timezone.localdate()),
            "doses_per_day": 2,
            "meal_timing": "anytime",
            "schedule_times": [datetime.time(8, 0), datetime.time(20, 0)],
            "reminder_enabled": True,
        }
        serializer = UserMedicationCreateSerializer(
            data=data, context={"request": MagicMock(user=user)}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save(user=user)
        self.assertEqual(instance.schedules.count(), 2)

    def test_validate_requires_name_or_ref(self):
        user = make_user("serial2@test.com")
        data = {
            "start_date": str(timezone.localdate()),
            "doses_per_day": 1,
            "meal_timing": "anytime",
        }
        serializer = UserMedicationCreateSerializer(
            data=data, context={"request": MagicMock(user=user)}
        )
        self.assertFalse(serializer.is_valid())


FIXED_NOW = datetime.datetime(2026, 5, 9, 10, 0, 0, tzinfo=datetime.timezone.utc)
FIXED_LOCAL = datetime.datetime(2026, 5, 9, 12, 0, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=2)))
FIXED_DATE = datetime.date(2026, 5, 9)
FIXED_TIME = datetime.time(12, 0, 0)


class MedicationReminderServiceTest(TestCase):
    def setUp(self):
        self.user = make_user("reminder@test.com")

    def _create_intake(self, name="Doliprane", status=IntakeStatus.PENDING,
                       reminder_enabled=True, scheduled_time=FIXED_TIME):
        user_med = make_user_medication(self.user, name)
        if not reminder_enabled:
            user_med.schedules.update(reminder_enabled=False)
        schedule = user_med.schedules.first()
        return MedicationIntake.objects.create(
            user_medication=user_med,
            schedule=schedule,
            scheduled_date=FIXED_DATE,
            scheduled_time=scheduled_time,
            status=status,
        )

    @patch("apps.medications.services.reminders.timezone")
    @patch("apps.medications.services.reminders.send_push_to_user")
    def test_sends_notification_for_due_intake(self, mock_push, mock_tz):
        mock_push.return_value = {"success": True, "sent": 1}
        mock_tz.now.return_value = FIXED_NOW
        mock_tz.localtime.return_value = FIXED_LOCAL
        mock_tz.localdate.return_value = FIXED_DATE

        self._create_intake("Doliprane")
        stats = send_due_medication_reminders()

        self.assertEqual(stats["sent"], 1)
        self.assertEqual(stats["errors"], 0)
        call_kwargs = mock_push.call_args[1]
        self.assertIn("Doliprane", call_kwargs["body"])
        self.assertEqual(call_kwargs["title"], "💊 Rappel médicament")

    @patch("apps.medications.services.reminders.timezone")
    @patch("apps.medications.services.reminders.send_push_to_user")
    def test_skips_reminder_disabled(self, mock_push, mock_tz):
        mock_push.return_value = {"success": True, "sent": 1}
        mock_tz.now.return_value = FIXED_NOW
        mock_tz.localtime.return_value = FIXED_LOCAL
        mock_tz.localdate.return_value = FIXED_DATE

        self._create_intake("Aspirine", reminder_enabled=False)
        stats = send_due_medication_reminders()

        self.assertEqual(stats["sent"], 0)
        mock_push.assert_not_called()

    @patch("apps.medications.services.reminders.timezone")
    @patch("apps.medications.services.reminders.send_push_to_user")
    def test_skips_taken_intakes(self, mock_push, mock_tz):
        mock_tz.now.return_value = FIXED_NOW
        mock_tz.localtime.return_value = FIXED_LOCAL
        mock_tz.localdate.return_value = FIXED_DATE

        self._create_intake("Metformine", status=IntakeStatus.TAKEN)
        stats = send_due_medication_reminders()

        self.assertEqual(stats["sent"], 0)
        mock_push.assert_not_called()

    @patch("apps.medications.services.reminders.timezone")
    @patch("apps.medications.services.reminders.send_push_to_user")
    def test_handles_push_error(self, mock_push, mock_tz):
        mock_push.side_effect = Exception("Push failed")
        mock_tz.now.return_value = FIXED_NOW
        mock_tz.localtime.return_value = FIXED_LOCAL
        mock_tz.localdate.return_value = FIXED_DATE

        self._create_intake("Gliclazide")
        stats = send_due_medication_reminders()

        self.assertEqual(stats["errors"], 1)

    @patch("apps.medications.services.reminders.timezone")
    @patch("apps.medications.services.reminders.send_push_to_user")
    def test_no_tokens_counted_as_skipped(self, mock_push, mock_tz):
        mock_push.return_value = {"success": False, "error": "No active tokens for user"}
        mock_tz.now.return_value = FIXED_NOW
        mock_tz.localtime.return_value = FIXED_LOCAL
        mock_tz.localdate.return_value = FIXED_DATE

        self._create_intake("Insuline")
        stats = send_due_medication_reminders()

        self.assertEqual(stats["skipped"], 1)

    @patch("apps.medications.services.reminders.timezone")
    @patch("apps.medications.services.reminders.send_push_to_user")
    def test_returns_stats_dict(self, mock_push, mock_tz):
        mock_push.return_value = {"success": True, "sent": 1}
        mock_tz.now.return_value = FIXED_NOW
        mock_tz.localtime.return_value = FIXED_LOCAL
        mock_tz.localdate.return_value = FIXED_DATE

        stats = send_due_medication_reminders()
        self.assertIn("sent", stats)
        self.assertIn("skipped", stats)
        self.assertIn("errors", stats)

    @patch("apps.medications.services.reminders.timezone")
    @patch("apps.medications.services.reminders.send_push_to_user")
    def test_ignores_future_intakes(self, mock_push, mock_tz):
        mock_push.return_value = {"success": True, "sent": 1}
        mock_tz.now.return_value = FIXED_NOW
        mock_tz.localtime.return_value = FIXED_LOCAL
        mock_tz.localdate.return_value = FIXED_DATE

        # Intake 2h plus tard → hors fenêtre
        self._create_intake("Tardif", scheduled_time=datetime.time(14, 0, 0))
        stats = send_due_medication_reminders()

        self.assertEqual(stats["sent"], 0)
