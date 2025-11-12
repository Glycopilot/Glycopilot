from django.conf import settings
from django.db import models


class Alert(models.Model):
    alert_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    glycemia_interval = models.CharField(
        max_length=50, blank=True, null=True
    )  # e.g. "70-110"
    danger_level = models.IntegerField(default=1)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "alerts"


class UserAlert(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_alerts"
    )
    alert = models.ForeignKey(
        Alert, on_delete=models.CASCADE, related_name="user_alerts"
    )
    sent_at = models.DateTimeField(blank=True, null=True)
    statut = models.BooleanField(default=False)

    class Meta:
        db_table = "user_alerts"
        unique_together = ("user", "alert")
