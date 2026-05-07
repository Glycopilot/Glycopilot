from django.contrib import admin

from .models import Notification, PushToken, UserNotification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Notification."""

    list_display = ("name", "type")
    list_filter = ("type",)
    search_fields = ("name", "type", "description")
    ordering = ("name",)


@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour UserNotification."""

    list_display = ("user", "notification", "sent_at", "statut")
    list_filter = ("statut", "notification", "sent_at")
    search_fields = ("user__username", "user__email", "notification__name")
    raw_id_fields = ("user", "notification")
    date_hierarchy = "sent_at"


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "device_type", "is_active", "token_preview", "created_at")
    list_filter = ("device_type", "is_active")
    search_fields = ("user__email", "token")

    def token_preview(self, obj):
        return obj.token[:35] + "..."
    token_preview.short_description = "Token"
