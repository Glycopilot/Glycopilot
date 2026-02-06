from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import AlertRule, UserAlertRule


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def subscribe_new_user_to_alert_rules(sender, instance, created, **kwargs):
    """Auto-subscribe newly created users to all active AlertRules."""
    if not created:
        return

    active_rules = AlertRule.objects.filter(is_active=True)
    UserAlertRule.objects.bulk_create(
        [UserAlertRule(user=instance, rule=rule) for rule in active_rules],
        ignore_conflicts=True,
    )
