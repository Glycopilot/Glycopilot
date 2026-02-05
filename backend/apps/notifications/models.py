from django.conf import settings
from django.db import models


class Notification(models.Model):
    notification_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    type = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "notifications"


class UserNotification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_notifications",
    )
    notification = models.ForeignKey(
        Notification, on_delete=models.CASCADE, related_name="user_notifications"
    )
    sent_at = models.DateTimeField(blank=True, null=True)
    statut = models.BooleanField(default=False)

    class Meta:
        db_table = "user_notifications"
        unique_together = ("user", "notification")
