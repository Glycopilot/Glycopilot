from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.glycemia.services import ia_client


class IAClientServiceTests(TestCase):
    def test_build_payload_formats_dates_and_optional_fields(self):
        user = MagicMock()
        user.id_auth = "auth-1"
        instance = MagicMock()
        instance.measured_at = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)

        readings = [
            {
                "measured_at": datetime(2026, 1, 1, 11, 30, tzinfo=timezone.utc),
                "value": 120,
                "trend": "",
                "rate": 0.0,
                "context": "",
            }
        ]

        payload = ia_client._build_payload(user, instance, readings)

        self.assertEqual(payload["user_id"], "auth-1")
        self.assertEqual(payload["for_time"], "2026-01-01T12:00:00+00:00")
        self.assertEqual(payload["readings"][0]["trend"], None)
        self.assertEqual(payload["readings"][0]["context"], None)

    @patch("apps.glycemia.services.ia_client._persist_prediction")
    @patch("apps.glycemia.services.ia_client._post_predict")
    @patch("apps.glycemia.services.ia_client._build_payload")
    @patch("apps.glycemia.services.ia_client._fetch_recent_readings")
    def test_request_prediction_calls_pipeline_when_enough_readings(
        self, mock_fetch, mock_build, mock_post, mock_persist
    ):
        instance = MagicMock()
        instance.user.id_auth = "auth-2"
        instance.measured_at = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)

        mock_fetch.return_value = [{"value": 1}] * 6
        mock_build.return_value = {"payload": True}
        mock_post.return_value = {"status": "ok", "predictions": {}}

        ia_client.request_prediction(instance)

        mock_build.assert_called_once()
        mock_post.assert_called_once_with({"payload": True})
        mock_persist.assert_called_once()

    @patch("apps.glycemia.services.ia_client._persist_prediction")
    @patch("apps.glycemia.services.ia_client._post_predict")
    @patch("apps.glycemia.services.ia_client._build_payload")
    @patch("apps.glycemia.services.ia_client._fetch_recent_readings")
    def test_request_prediction_skips_when_not_enough_readings(
        self, mock_fetch, mock_build, mock_post, mock_persist
    ):
        instance = MagicMock()
        instance.user.id_auth = "auth-3"
        instance.measured_at = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)

        mock_fetch.return_value = [{"value": 1}] * 5

        ia_client.request_prediction(instance)

        mock_build.assert_not_called()
        mock_post.assert_not_called()
        mock_persist.assert_not_called()

    @patch("apps.glycemia.services.ia_client.logger")
    @patch("apps.glycemia.services.ia_client._post_predict")
    @patch("apps.glycemia.services.ia_client._build_payload", return_value={})
    @patch("apps.glycemia.services.ia_client._fetch_recent_readings", return_value=[{"v": 1}] * 6)
    def test_request_prediction_handles_unexpected_errors(
        self, _mock_fetch, _mock_build, mock_post, mock_logger
    ):
        instance = MagicMock()
        instance.user.id_auth = "auth-4"
        instance.measured_at = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
        mock_post.side_effect = RuntimeError("boom")

        ia_client.request_prediction(instance)

        mock_logger.error.assert_called()
