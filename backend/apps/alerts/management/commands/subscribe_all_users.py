from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.alerts.models import AlertRule, UserAlertRule

User = get_user_model()


class Command(BaseCommand):
    help = "Subscribe all existing users to all active alert rules"

    def handle(self, *args, **options):
        active_rules = AlertRule.objects.filter(is_active=True)
        users = User.objects.all()

        created_count = 0
        for user in users:
            for rule in active_rules:
                _, created = UserAlertRule.objects.get_or_create(
                    user=user, rule=rule,
                )
                if created:
                    created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done: {created_count} subscriptions created "
                f"({users.count()} users x {active_rules.count()} rules)"
            )
        )
