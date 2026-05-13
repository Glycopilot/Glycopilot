from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.alerts.models import AlertEvent, AlertEventStatus, AlertRule, UserAlertRule

User = get_user_model()


def _mk_user(email="alerts-api@test.com"):
    return User.objects.create_user(email=email, password="pass123")


def _mk_rule(code="HYPO_API", min_g=None, max_g=80):
    return AlertRule.objects.create(
        code=code,
        name="Hypoglycémie API",
        min_glycemia=min_g,
        max_glycemia=max_g,
        severity=4,
        is_active=True,
    )


class AlertRuleViewSetTests(APITestCase):
    def setUp(self):
        self.user = _mk_user()
        self.client.force_authenticate(user=self.user)
        self.rule = _mk_rule()

    def test_list_active_rules_returns_200(self):
        response = self.client.get("/api/alerts/rules/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_includes_active_rule(self):
        response = self.client.get("/api/alerts/rules/")
        codes = [r["code"] for r in response.data.get("results", response.data)]
        self.assertIn("HYPO_API", codes)

    def test_inactive_rules_are_excluded(self):
        AlertRule.objects.create(
            code="INACTIVE_API", name="Inactive", max_glycemia=60, severity=1, is_active=False
        )
        response = self.client.get("/api/alerts/rules/")
        codes = [r["code"] for r in response.data.get("results", response.data)]
        self.assertNotIn("INACTIVE_API", codes)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/alerts/rules/").status_code, status.HTTP_401_UNAUTHORIZED)


class UserAlertSettingsViewSetTests(APITestCase):
    def setUp(self):
        self.user = _mk_user("alert-settings@test.com")
        self.other = _mk_user("alert-settings-other@test.com")
        self.client.force_authenticate(user=self.user)
        self.rule = _mk_rule(code="HYPO_SET")

    def test_create_user_alert_setting(self):
        payload = {"rule_id": self.rule.id, "enabled": True, "cooldown_seconds": 300}
        response = self.client.post("/api/alerts/settings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(UserAlertRule.objects.filter(user=self.user, rule=self.rule).exists())

    def test_list_returns_only_own_settings(self):
        UserAlertRule.objects.create(user=self.user, rule=self.rule)
        other_rule = _mk_rule(code="HYPO_OTHER")
        UserAlertRule.objects.create(user=self.other, rule=other_rule)

        response = self.client.get("/api/alerts/settings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/alerts/settings/").status_code, status.HTTP_401_UNAUTHORIZED)


class AlertHistoryViewSetTests(APITestCase):
    def setUp(self):
        self.user = _mk_user("alert-hist@test.com")
        self.other = _mk_user("alert-hist-other@test.com")
        self.client.force_authenticate(user=self.user)
        self.rule = _mk_rule(code="HYPO_HIST")

    def test_list_events_returns_200(self):
        response = self.client.get("/api/alerts/events/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_returns_only_own_events(self):
        AlertEvent.objects.create(user=self.user, rule=self.rule, glycemia_value=60)
        AlertEvent.objects.create(user=self.other, rule=self.rule, glycemia_value=55)

        response = self.client.get("/api/alerts/events/")
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_ack_event(self):
        event = AlertEvent.objects.create(
            user=self.user, rule=self.rule, glycemia_value=65,
            status=AlertEventStatus.TRIGGERED,
        )
        response = self.client.post(
            "/api/alerts/events/ack/",
            {"event_id": event.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event.refresh_from_db()
        self.assertEqual(event.status, AlertEventStatus.ACKED)

    def test_ack_returns_400_when_event_id_missing(self):
        response = self.client.post("/api/alerts/events/ack/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ack_returns_404_for_unknown_event(self):
        response = self.client.post(
            "/api/alerts/events/ack/", {"event_id": 99999}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_treat_event(self):
        event = AlertEvent.objects.create(
            user=self.user, rule=self.rule, glycemia_value=70,
            status=AlertEventStatus.TRIGGERED,
        )
        response = self.client.post(
            "/api/alerts/events/treat/",
            {"event_id": event.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event.refresh_from_db()
        self.assertEqual(event.status, "TREATING")

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/alerts/events/").status_code, status.HTTP_401_UNAUTHORIZED)
