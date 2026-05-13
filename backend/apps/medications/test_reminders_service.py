from datetime import time
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.medications.services.reminders import send_due_medication_reminders


class MedicationRemindersServiceTests(TestCase):
    @patch("apps.medications.services.reminders.MedicationIntake")
    def test_send_due_medication_reminders_returns_zero_stats_when_none_due(
        self, mock_intake
    ):
        mock_intake.objects.filter.return_value.select_related.return_value = []

        result = send_due_medication_reminders()

        self.assertEqual(result, {"sent": 0, "skipped": 0, "errors": 0})

    @patch("apps.medications.services.reminders.send_push_to_user")
    @patch("apps.medications.services.reminders.MedicationIntake")
    def test_send_due_medication_reminders_counts_sent_and_skipped(
        self, mock_intake, mock_send_push
    ):
        user = MagicMock()
        intake_ok = MagicMock()
        intake_ok.id = 1
        intake_ok.scheduled_time = time(8, 0, 0)
        intake_ok.user_medication.user = user
        intake_ok.user_medication.display_name = "Metformin"

        intake_skip = MagicMock()
        intake_skip.id = 2
        intake_skip.scheduled_time = time(9, 0, 0)
        intake_skip.user_medication.user = user
        intake_skip.user_medication.display_name = "Insulin"

        mock_intake.objects.filter.return_value.select_related.return_value = [
            intake_ok,
            intake_skip,
        ]
        mock_send_push.side_effect = [
            {"success": True},
            {"success": False, "error": "No active tokens for user"},
        ]

        result = send_due_medication_reminders()

        self.assertEqual(result, {"sent": 1, "skipped": 1, "errors": 0})
        self.assertEqual(mock_send_push.call_count, 2)

    @patch("apps.medications.services.reminders.send_push_to_user")
    @patch("apps.medications.services.reminders.MedicationIntake")
    def test_send_due_medication_reminders_counts_errors(
        self, mock_intake, mock_send_push
    ):
        user = MagicMock()
        intake = MagicMock()
        intake.id = 3
        intake.scheduled_time = time(10, 0, 0)
        intake.user_medication.user = user
        intake.user_medication.display_name = "Aspirin"

        mock_intake.objects.filter.return_value.select_related.return_value = [intake]
        mock_send_push.side_effect = RuntimeError("push provider down")

        result = send_due_medication_reminders()

        self.assertEqual(result, {"sent": 0, "skipped": 0, "errors": 1})
