from django.test import TestCase

from apps.dashboard.serializers import WidgetLayoutItemSerializer, WidgetLayoutUpdateSerializer


class DashboardSerializerTests(TestCase):
    def test_widget_layout_item_rejects_unknown_widget(self):
        serializer = WidgetLayoutItemSerializer(
            data={
                "widgetId": "unknown_widget",
                "column": 0,
                "row": 0,
                "size": "normal",
                "pinned": False,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("widgetId", serializer.errors)

    def test_widget_layout_update_rejects_duplicate_widget_ids(self):
        serializer = WidgetLayoutUpdateSerializer(
            data={
                "layout": [
                    {
                        "widgetId": "glucose_live",
                        "column": 0,
                        "row": 0,
                        "size": "expanded",
                        "pinned": True,
                    },
                    {
                        "widgetId": "glucose_live",
                        "column": 1,
                        "row": 0,
                        "size": "normal",
                        "pinned": False,
                    },
                    {
                        "widgetId": "alerts",
                        "column": 0,
                        "row": 1,
                        "size": "compact",
                        "pinned": False,
                    },
                ]
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("layout", serializer.errors)

    def test_widget_layout_update_accepts_valid_layout(self):
        serializer = WidgetLayoutUpdateSerializer(
            data={
                "layout": [
                    {
                        "widgetId": "glucose_live",
                        "column": 0,
                        "row": 0,
                        "size": "expanded",
                        "pinned": True,
                    },
                    {
                        "widgetId": "alerts",
                        "column": 1,
                        "row": 0,
                        "size": "compact",
                        "pinned": False,
                    },
                    {
                        "widgetId": "medications",
                        "column": 0,
                        "row": 1,
                        "size": "normal",
                        "pinned": False,
                    },
                ]
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
