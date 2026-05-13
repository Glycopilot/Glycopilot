from unittest import TestCase
from unittest.mock import patch

from apps.dashboard.services.dashboard_cache import DashboardCache


class DashboardCacheServiceTests(TestCase):
    def test_make_key_uses_expected_format(self):
        key = DashboardCache._make_key(42, "summary")
        self.assertEqual(key, "dashboard:summary:42")

    @patch("apps.dashboard.services.dashboard_cache.cache")
    def test_get_summary_reads_from_cache(self, mock_cache):
        mock_cache.get.return_value = {"ok": True}

        result = DashboardCache.get_summary(7)

        self.assertEqual(result, {"ok": True})
        mock_cache.get.assert_called_once_with("dashboard:summary:7")

    @patch("apps.dashboard.services.dashboard_cache.cache")
    def test_set_summary_uses_default_ttl_when_none(self, mock_cache):
        payload = {"glucose": {"value": 120}}

        DashboardCache.set_summary(8, payload)

        mock_cache.set.assert_called_once_with(
            "dashboard:summary:8", payload, DashboardCache.DEFAULT_TTL
        )

    @patch("apps.dashboard.services.dashboard_cache.cache")
    def test_set_summary_uses_custom_ttl_when_provided(self, mock_cache):
        payload = {"alerts": []}

        DashboardCache.set_summary(8, payload, ttl=120)

        mock_cache.set.assert_called_once_with("dashboard:summary:8", payload, 120)

    @patch("apps.dashboard.services.dashboard_cache.cache")
    def test_invalidate_summary_deletes_summary_key(self, mock_cache):
        DashboardCache.invalidate_summary(11)
        mock_cache.delete.assert_called_once_with("dashboard:summary:11")

    @patch("apps.dashboard.services.dashboard_cache.cache")
    def test_get_widgets_reads_widgets_key(self, mock_cache):
        mock_cache.get.return_value = [{"widgetId": "alerts"}]

        result = DashboardCache.get_widgets(3)

        self.assertEqual(result, [{"widgetId": "alerts"}])
        mock_cache.get.assert_called_once_with("dashboard:widgets:3")

    @patch("apps.dashboard.services.dashboard_cache.cache")
    def test_set_widgets_with_custom_ttl(self, mock_cache):
        payload = [{"widgetId": "glucose_live"}]

        DashboardCache.set_widgets(3, payload, ttl=90)

        mock_cache.set.assert_called_once_with("dashboard:widgets:3", payload, 90)

    @patch("apps.dashboard.services.dashboard_cache.cache")
    def test_invalidate_all_calls_summary_and_widgets_invalidation(self, mock_cache):
        DashboardCache.invalidate_all(99)

        mock_cache.delete.assert_any_call("dashboard:summary:99")
        mock_cache.delete.assert_any_call("dashboard:widgets:99")
        self.assertEqual(mock_cache.delete.call_count, 2)
