from django.test import TestCase

from apps.dashboard.views import DashboardWidgetsView


class DashboardWidgetsViewUnitTests(TestCase):
    def test_get_default_widgets_uses_catalog_defaults(self):
        view = DashboardWidgetsView()

        widgets = view._get_default_widgets()
        widget_ids = [w["widgetId"] for w in widgets]

        self.assertIn("glucose_live", widget_ids)
        self.assertIn("alerts", widget_ids)
        self.assertIn("medications", widget_ids)
        self.assertTrue(all(w["visible"] is True for w in widgets))
        self.assertTrue(all("refreshInterval" in w for w in widgets))
