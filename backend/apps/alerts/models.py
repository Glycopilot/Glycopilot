from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class AlertSeverity(models.IntegerChoices):
    INFO = 1, "INFO"
    LOW = 2, "LOW"
    MEDIUM = 3, "MEDIUM"
    HIGH = 4, "HIGH"
    CRITICAL = 5, "CRITICAL"


class AlertEventStatus(models.TextChoices):
    TRIGGERED = "TRIGGERED", "TRIGGERED"
    SENT = "SENT", "SENT"
    ACKED = "ACKED", "ACKED"
    RESOLVED = "RESOLVED", "RESOLVED"
    FAILED = "FAILED", "FAILED"


class AlertRule(models.Model):
    """
    Règle générique, seuils en mg/dL (bornes inclusives).
    """

    code = models.SlugField(max_length=50, unique=True)  # ex: "HYPO", "HYPER"
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)

    min_glycemia = models.IntegerField(blank=True, null=True)  # inclusive
    max_glycemia = models.IntegerField(blank=True, null=True)  # inclusive

    severity = models.PositiveSmallIntegerField(
        choices=AlertSeverity.choices,
        default=AlertSeverity.MEDIUM,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "alert_rules"
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["severity"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class UserAlertRule(models.Model):
    """
    Activation + overrides + anti-spam (cooldown) par user.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alert_rules"
    )
    rule = models.ForeignKey(
        AlertRule, on_delete=models.CASCADE, related_name="user_rules"
    )

    enabled = models.BooleanField(default=True)

    # Overrides optionnels
    min_glycemia_override = models.IntegerField(blank=True, null=True)
    max_glycemia_override = models.IntegerField(blank=True, null=True)

    # Rate limit des push
    cooldown_seconds = models.PositiveIntegerField(default=600)  # 10 min

    class Meta:
        db_table = "user_alert_rules"
        constraints = [
            models.UniqueConstraint(fields=["user", "rule"], name="uniq_user_rule")
        ]
        indexes = [
            models.Index(fields=["user", "enabled"]),
            models.Index(fields=["rule", "enabled"]),
        ]


class AlertEvent(models.Model):
    """
    Occurrence (historique) + delivery push/in-app + ack.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alert_events"
    )
    rule = models.ForeignKey(AlertRule, on_delete=models.PROTECT, related_name="events")

    glycemia_value = models.IntegerField()
    triggered_at = models.DateTimeField(auto_now_add=True)

    # In-app : on crée une entrée systématiquement
    inapp_created_at = models.DateTimeField(blank=True, null=True)

    # Push : soumis au cooldown
    push_sent_at = models.DateTimeField(blank=True, null=True)

    # Cycle de vie
    status = models.CharField(
        max_length=20,
        choices=AlertEventStatus.choices,
        default=AlertEventStatus.TRIGGERED,
    )
    acked_at = models.DateTimeField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)

    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "alert_events"
        indexes = [
            models.Index(fields=["user", "-triggered_at"]),
            models.Index(fields=["rule", "-triggered_at"]),
            models.Index(fields=["status", "-triggered_at"]),
            models.Index(fields=["user", "rule", "-triggered_at"]),
        ]
