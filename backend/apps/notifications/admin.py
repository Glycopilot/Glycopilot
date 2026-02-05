from django.contrib import admin

from .models import Notification, UserNotification


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
