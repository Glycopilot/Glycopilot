from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.alerts.services.push import PushSendError, send_push


class AlertsPushServiceTests(TestCase):
    @patch("apps.alerts.services.push.send_push_to_user")
    def test_send_push_succeeds_when_notification_service_returns_success(
        self, mock_send_push_to_user
    ):
        user = MagicMock()
        user.email = "ok@test.com"
        mock_send_push_to_user.return_value = {"success": True, "sent": 1}

        send_push(user=user, title="Alert", body="Body", data={"x": 1})

        mock_send_push_to_user.assert_called_once_with(
            user, "Alert", "Body", {"x": 1}
        )

    @patch("apps.alerts.services.push.send_push_to_user")
    def test_send_push_ignores_missing_tokens_error(self, mock_send_push_to_user):
        user = MagicMock()
        user.email = "no-token@test.com"
        mock_send_push_to_user.return_value = {
            "success": False,
            "error": "No active tokens for user",
        }

        # Must not raise for this case.
        send_push(user=user, title="Alert", body="Body")

    @patch("apps.alerts.services.push.send_push_to_user")
    def test_send_push_raises_custom_error_for_other_failures(self, mock_send_push_to_user):
        user = MagicMock()
        user.email = "fail@test.com"
        mock_send_push_to_user.return_value = {
            "success": False,
            "error": "Expo API unavailable",
        }

        with self.assertRaises(PushSendError):
            send_push(user=user, title="Alert", body="Body")
