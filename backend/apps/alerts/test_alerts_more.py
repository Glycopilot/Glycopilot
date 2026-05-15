from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.alerts.models import AlertEvent, AlertEventStatus, AlertRule, UserAlertRule

User = get_user_model()


def _mk_user(email="alerts-more@test.com"):
    return User.objects.create_user(email=email, password="pass123")


def _mk_rule(code="HYPO_MORE", min_g=None, max_g=80):
    return AlertRule.objects.create(
        code=code, name="Hypo More", min_glycemia=min_g, max_glycemia=max_g,
        severity=4, is_active=True
    )


class UserAlertSettingsUpdateTests(APITestCase):
    def setUp(self):
        self.user = _mk_user()
        self.client.force_authenticate(user=self.user)
        self.rule = _mk_rule()
        self.setting = UserAlertRule.objects.create(
            user=self.user, rule=self.rule, enabled=True, cooldown_seconds=300
        )

    def test_update_setting_cooldown(self):
        response = self.client.patch(
            f"/api/alerts/settings/{self.setting.id}/",
            {"cooldown_seconds": 600},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.setting.refresh_from_db()
        self.assertEqual(self.setting.cooldown_seconds, 600)

    def test_update_setting_disable(self):
        response = self.client.patch(
            f"/api/alerts/settings/{self.setting.id}/",
            {"enabled": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.setting.refresh_from_db()
        self.assertFalse(self.setting.enabled)

    def test_delete_setting(self):
        response = self.client.delete(f"/api/alerts/settings/{self.setting.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserAlertRule.objects.filter(pk=self.setting.pk).exists())

    def test_retrieve_setting(self):
        response = self.client.get(f"/api/alerts/settings/{self.setting.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("enabled", response.data)


class AlertEventTreatTests(APITestCase):
    def setUp(self):
        self.user = _mk_user("treat-more@test.com")
        self.client.force_authenticate(user=self.user)
        self.rule = _mk_rule(code="TREAT_MORE")

    def test_treat_without_event_id_returns_400(self):
        response = self.client.post("/api/alerts/events/treat/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_treat_nonexistent_event_returns_404(self):
        response = self.client.post(
            "/api/alerts/events/treat/", {"event_id": 99999}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_history_endpoint_returns_events(self):
        AlertEvent.objects.create(
            user=self.user, rule=self.rule, glycemia_value=70,
            status=AlertEventStatus.ACKED
        )
        response = self.client.get("/api/alerts/events/")
        results = response.data.get("results", response.data)
        self.assertGreater(len(results), 0)
