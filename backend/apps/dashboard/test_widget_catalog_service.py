from django.test import TestCase

from apps.dashboard.services.widget_catalog import WidgetCatalog


class WidgetCatalogServiceTests(TestCase):
    def test_get_all_widgets_returns_definitions(self):
        widgets = WidgetCatalog.get_all_widgets()

        self.assertGreater(len(widgets), 0)
        self.assertTrue(any(w.widget_id == "glucose_live" for w in widgets))

    def test_get_default_widgets_contains_expected_core_widgets(self):
        default_widgets = WidgetCatalog.get_default_widgets()

        self.assertIn("glucose_live", default_widgets)
        self.assertIn("alerts", default_widgets)
        self.assertIn("medications", default_widgets)

    def test_is_valid_size_returns_false_for_unknown_widget(self):
        self.assertFalse(WidgetCatalog.is_valid_size("unknown_widget", "normal"))

    def test_non_hideable_widgets_are_not_hideable(self):
        ids = WidgetCatalog.get_non_hideable_widgets()
        self.assertIn("glucose_live", ids)
        self.assertIn("alerts", ids)
