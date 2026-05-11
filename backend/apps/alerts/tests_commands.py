from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.alerts.models import AlertRule


class InitAlertRulesCommandTest(TestCase):
    def test_init_alert_rules_success(self):
        """Test that init_alert_rules command creates the default rules."""
        out = StringIO()
        call_command("init_alert_rules", stdout=out)

        # Verify rules are created
        self.assertEqual(AlertRule.objects.count(), 2)
        self.assertTrue(AlertRule.objects.filter(code="HYPO").exists())
        self.assertTrue(AlertRule.objects.filter(code="HYPER").exists())

        self.assertIn("Created rule", out.getvalue())

        # Run again to test update
        out_update = StringIO()
        call_command("init_alert_rules", stdout=out_update)
        self.assertIn("Updated rule", out_update.getvalue())
        self.assertEqual(AlertRule.objects.count(), 2)
