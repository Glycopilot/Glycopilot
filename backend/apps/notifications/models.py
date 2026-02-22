import uuid

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


class DeviceType(models.TextChoices):
    IOS = "ios", "iOS"
    ANDROID = "android", "Android"


class PushToken(models.Model):
    """
    Store Expo push tokens for sending push notifications.
    A user can have multiple tokens (multiple devices).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_tokens",
    )
    token = models.CharField(max_length=255, unique=True)  # ExponentPushToken[xxx]
    device_type = models.CharField(
        max_length=20,
        choices=DeviceType.choices,
        default=DeviceType.ANDROID,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "push_tokens"

    def __str__(self):
        return f"{self.user.email} - {self.device_type} - {self.token[:20]}..."
