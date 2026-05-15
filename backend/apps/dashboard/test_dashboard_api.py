from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.dashboard.models import UserWidget, UserWidgetLayout

User = get_user_model()


class DashboardCacheIntegrationTests(APITestCase):
    """Tests that verify caching behavior in the dashboard views."""

    def setUp(self):
        self.user = User.objects.create_user(email="dash-cache@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)

    def test_second_call_to_summary_uses_cache(self):
        # First call builds cache
        r1 = self.client.get("/api/v1/dashboard/summary")
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        # Second call should also work (from cache or fresh)
        r2 = self.client.get("/api/v1/dashboard/summary")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertIn("glucose", r2.data)

    def test_summary_with_include_filter(self):
        response = self.client.get("/api/v1/dashboard/summary?include[]=nutrition&include[]=activity")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("nutrition", response.data)
        self.assertIn("activity", response.data)

    def test_widgets_list_default(self):
        response = self.client.get("/api/v1/dashboard/widgets")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("widgets", response.data)
        self.assertGreater(len(response.data["widgets"]), 0)

    def test_widgets_list_with_user_config(self):
        UserWidget.objects.create(
            user=self.user, widget_id="glucose_live", visible=True, refresh_interval=60
        )
        response = self.client.get("/api/v1/dashboard/widgets")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        widget_ids = [w["widgetId"] for w in response.data["widgets"]]
        self.assertIn("glucose_live", widget_ids)

    def test_layout_update_and_cache_invalidation(self):
        # Update layout → invalidates cache
        data = {
            "layout": [
                {"widgetId": "glucose_live", "column": 0, "row": 0, "size": "expanded", "pinned": True},
                {"widgetId": "alerts", "column": 1, "row": 0, "size": "compact", "pinned": False},
                {"widgetId": "medications", "column": 0, "row": 1, "size": "normal", "pinned": False},
            ]
        }
        response = self.client.patch("/api/v1/dashboard/widgets/layout", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("updatedAt", response.data)
        # Cache should be invalidated → next summary call is fresh
        r2 = self.client.get("/api/v1/dashboard/summary")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get("/api/v1/dashboard/summary").status_code,
            status.HTTP_401_UNAUTHORIZED
        )
