from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import AuthAccount

from .models import UserWidget, UserWidgetLayout, WidgetSize
from .services import HealthScoreService, WidgetCatalog


class WidgetCatalogTest(TestCase):
    def test_widget_exists(self):
        self.assertTrue(WidgetCatalog.widget_exists("glucose_live"))
        self.assertTrue(WidgetCatalog.widget_exists("medications"))
        self.assertFalse(WidgetCatalog.widget_exists("invalid_widget"))

    def test_get_widget(self):
        widget = WidgetCatalog.get_widget("glucose_live")
        self.assertIsNotNone(widget)
        self.assertEqual(widget.widget_id, "glucose_live")
        self.assertEqual(widget.title, "Glucose Live")
        self.assertFalse(widget.can_hide)

    def test_get_non_hideable_widgets(self):
        non_hideable = WidgetCatalog.get_non_hideable_widgets()
        self.assertIn("glucose_live", non_hideable)
        self.assertIn("alerts", non_hideable)

    def test_is_valid_size(self):
        self.assertTrue(WidgetCatalog.is_valid_size("glucose_live", "normal"))
        self.assertTrue(WidgetCatalog.is_valid_size("glucose_live", "expanded"))
        self.assertFalse(WidgetCatalog.is_valid_size("glucose_live", "compact"))

    def test_max_widgets(self):
        self.assertEqual(WidgetCatalog.MAX_WIDGETS, 10)


class UserWidgetModelTest(TestCase):
    def setUp(self):
        self.user = AuthAccount.objects.create_user(
            email="test@example.com", password="testpass123"
        )

    def test_create_user_widget(self):
        widget = UserWidget.objects.create(
            user=self.user, widget_id="glucose_live", visible=True, refresh_interval=60
        )
        self.assertEqual(widget.user, self.user)
        self.assertEqual(widget.widget_id, "glucose_live")
        self.assertTrue(widget.visible)

    def test_unique_constraint(self):
        UserWidget.objects.create(user=self.user, widget_id="glucose_live")
        with self.assertRaises(Exception):
            UserWidget.objects.create(user=self.user, widget_id="glucose_live")


class UserWidgetLayoutModelTest(TestCase):
    def setUp(self):
        self.user = AuthAccount.objects.create_user(
            email="test@example.com", password="testpass123"
        )

    def test_create_widget_layout(self):
        layout = UserWidgetLayout.objects.create(
            user=self.user,
            widget_id="glucose_live",
            column=0,
            row=0,
            size=WidgetSize.EXPANDED,
            pinned=True,
        )
        self.assertEqual(layout.column, 0)
        self.assertEqual(layout.row, 0)
        self.assertEqual(layout.size, "expanded")
        self.assertTrue(layout.pinned)


class DashboardSummaryAPITest(APITestCase):
    def setUp(self):
        self.user = AuthAccount.objects.create_user(
            email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_get_summary_authenticated(self):
        url = reverse("dashboard-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("glucose", response.data)
        self.assertIn("alerts", response.data)
        self.assertIn("medication", response.data)
        self.assertIn("nutrition", response.data)
        self.assertIn("activity", response.data)
        self.assertIn("healthScore", response.data)

    def test_get_summary_unauthenticated(self):
        self.client.force_authenticate(user=None)
        url = reverse("dashboard-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_summary_with_include_filter(self):
        url = reverse("dashboard-summary")
        response = self.client.get(url, {"include[]": ["nutrition"]})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class DashboardWidgetsAPITest(APITestCase):
    def setUp(self):
        self.user = AuthAccount.objects.create_user(
            email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_get_widgets_default(self):
        url = reverse("dashboard-widgets")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("widgets", response.data)
        self.assertTrue(len(response.data["widgets"]) > 0)

    def test_get_widgets_with_user_config(self):
        UserWidget.objects.create(
            user=self.user, widget_id="glucose_live", visible=True, refresh_interval=60
        )
        url = reverse("dashboard-widgets")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class DashboardWidgetLayoutAPITest(APITestCase):
    def setUp(self):
        self.user = AuthAccount.objects.create_user(
            email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_update_layout_valid(self):
        url = reverse("dashboard-widgets-layout")
        data = {
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
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("layout", response.data)
        self.assertIn("updatedAt", response.data)

        self.assertEqual(UserWidgetLayout.objects.filter(user=self.user).count(), 3)

    def test_update_layout_invalid_widget(self):
        url = reverse("dashboard-widgets-layout")
        data = {
            "layout": [
                {
                    "widgetId": "invalid_widget",
                    "column": 0,
                    "row": 0,
                    "size": "normal",
                    "pinned": False,
                },
                {
                    "widgetId": "glucose_live",
                    "column": 1,
                    "row": 0,
                    "size": "expanded",
                    "pinned": True,
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
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_layout_invalid_size(self):
        url = reverse("dashboard-widgets-layout")
        data = {
            "layout": [
                {
                    "widgetId": "glucose_live",
                    "column": 0,
                    "row": 0,
                    "size": "compact",
                    "pinned": False,
                },
                {
                    "widgetId": "alerts",
                    "column": 1,
                    "row": 0,
                    "size": "compact",
                    "pinned": False,
                },
            ]
        }
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_layout_missing_non_hideable(self):
        url = reverse("dashboard-widgets-layout")
        data = {
            "layout": [
                {
                    "widgetId": "medications",
                    "column": 0,
                    "row": 0,
                    "size": "normal",
                    "pinned": False,
                }
            ]
        }
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_layout_too_many_widgets(self):
        url = reverse("dashboard-widgets-layout")
        layout = []
        for i in range(12):
            layout.append(
                {
                    "widgetId": "glucose_live" if i == 0 else f"medications",
                    "column": i % 4,
                    "row": i // 4,
                    "size": "normal",
                    "pinned": False,
                }
            )
        data = {"layout": layout}
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
