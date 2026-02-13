"""
Django signals for user-related events.

Automatically creates default alert rules (HYPO/HYPER) for new users.
"""

import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_alert_rules(sender, instance, created, **kwargs):
    """
    Create default UserAlertRule entries for new users.

    Every new user gets HYPO and HYPER alert rules enabled by default.
    """
    if not created:
        return

    try:
        from apps.alerts.models import AlertRule, UserAlertRule

        # Get all active alert rules (HYPO, HYPER, etc.)
        active_rules = AlertRule.objects.filter(is_active=True)

        for rule in active_rules:
            UserAlertRule.objects.get_or_create(
                user=instance,
                rule=rule,
                defaults={
                    "enabled": True,
                    "cooldown_seconds": 600,  # 10 min
                },
            )

        if active_rules.exists():
            logger.info(
                f"Created {active_rules.count()} default alert rule(s) "
                f"for user {instance.email}"
            )
    except Exception as e:
        # Don't fail user creation if alerts setup fails
        logger.error(f"Failed to create default alert rules for {instance.email}: {e}")
