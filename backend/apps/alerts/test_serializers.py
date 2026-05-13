from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.alerts.models import AlertEvent, AlertEventStatus, AlertRule, UserAlertRule
from apps.alerts.serializers import (
    AlertEventSerializer,
    AlertRuleSerializer,
    UserAlertRuleSerializer,
)

User = get_user_model()


def _mk_user(email="ser@test.com"):
    return User.objects.create_user(email=email, password="pass123")


def _mk_rule(code="HYPO_SER", min_g=None, max_g=80):
    return AlertRule.objects.create(
        code=code,
        name=code,
        min_glycemia=min_g,
        max_glycemia=max_g,
        severity=3,
        is_active=True,
    )


class AlertRuleSerializerTests(TestCase):
    def test_serializes_all_fields(self):
        rule = _mk_rule()
        data = AlertRuleSerializer(rule).data

        self.assertEqual(data["code"], "HYPO_SER")
        self.assertIn("severity", data)
        self.assertIn("is_active", data)

    def test_all_fields_flag_serializes_all_model_fields(self):
        rule = _mk_rule()
        data = AlertRuleSerializer(rule).data

        self.assertIn("id", data)
        self.assertIn("max_glycemia", data)
        self.assertIn("min_glycemia", data)


class UserAlertRuleSerializerTests(TestCase):
    def setUp(self):
        self.user = _mk_user()
        self.rule = _mk_rule(code="UAR_SER")

    def test_contains_rule_details_as_nested_object(self):
        ur = UserAlertRule.objects.create(
            user=self.user,
            rule=self.rule,
            enabled=True,
            cooldown_seconds=300,
        )
        data = UserAlertRuleSerializer(ur).data

        self.assertIn("rule_details", data)
        self.assertEqual(data["rule_details"]["code"], "UAR_SER")
        self.assertEqual(data["enabled"], True)
        self.assertEqual(data["cooldown_seconds"], 300)

    def test_rule_id_is_write_only(self):
        ur = UserAlertRule.objects.create(user=self.user, rule=self.rule)
        data = UserAlertRuleSerializer(ur).data

        self.assertNotIn("rule_id", data)


class AlertEventSerializerTests(TestCase):
    def setUp(self):
        self.user = _mk_user("event-ser@test.com")
        self.rule = _mk_rule(code="EVT_SER")

    def test_serializes_event_with_rule_name(self):
        event = AlertEvent.objects.create(
            user=self.user,
            rule=self.rule,
            glycemia_value=65,
            status=AlertEventStatus.TRIGGERED,
        )
        data = AlertEventSerializer(event).data

        self.assertEqual(data["glycemia_value"], 65)
        self.assertEqual(data["rule_name"], "EVT_SER")
        self.assertEqual(data["status"], AlertEventStatus.TRIGGERED)

    def test_triggered_at_is_read_only(self):
        event = AlertEvent.objects.create(
            user=self.user,
            rule=self.rule,
            glycemia_value=65,
        )
        serializer = AlertEventSerializer(
            event,
            data={
                "glycemia_value": 70,
                "rule": self.rule.id,
                "triggered_at": "2020-01-01T00:00:00Z",
                "status": AlertEventStatus.TRIGGERED,
            },
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("triggered_at", serializer.validated_data)
