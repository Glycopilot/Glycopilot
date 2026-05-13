from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.alerts.models import AlertRule, UserAlertRule

User = get_user_model()


class AlertSignalTests(TestCase):
    def setUp(self):
        self.rule1 = AlertRule.objects.create(
            code="SIGNAL_HYPO", name="Signal Hypo", max_glycemia=70, severity=4, is_active=True
        )
        self.rule2 = AlertRule.objects.create(
            code="SIGNAL_HYPER", name="Signal Hyper", min_glycemia=181, severity=3, is_active=True
        )
        AlertRule.objects.create(
            code="SIGNAL_INACTIVE", name="Inactive", max_glycemia=50, severity=1, is_active=False
        )

    def test_new_user_is_subscribed_to_active_rules(self):
        user = User.objects.create_user(email="signal-user@test.com", password="pass123")

        active_codes = set(
            UserAlertRule.objects.filter(user=user).values_list("rule__code", flat=True)
        )
        self.assertIn("SIGNAL_HYPO", active_codes)
        self.assertIn("SIGNAL_HYPER", active_codes)

    def test_new_user_is_not_subscribed_to_inactive_rules(self):
        user = User.objects.create_user(email="signal-user2@test.com", password="pass123")

        codes = set(
            UserAlertRule.objects.filter(user=user).values_list("rule__code", flat=True)
        )
        self.assertNotIn("SIGNAL_INACTIVE", codes)

    def test_updating_existing_user_does_not_add_subscriptions(self):
        user = User.objects.create_user(email="signal-user3@test.com", password="pass123")
        count_before = UserAlertRule.objects.filter(user=user).count()

        user.email = "signal-user3-updated@test.com"
        user.save()

        count_after = UserAlertRule.objects.filter(user=user).count()
        self.assertEqual(count_before, count_after)
