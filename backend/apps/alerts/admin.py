from django.contrib import admin

from .models import Alert, UserAlert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Alert."""

    list_display = ("name", "glycemia_interval", "danger_level")
    list_filter = ("danger_level",)
    search_fields = ("name", "description")
    ordering = ("danger_level", "name")


@admin.register(UserAlert)
class UserAlertAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour UserAlert."""

    list_display = ("user", "alert", "sent_at", "statut")
    list_filter = ("statut", "alert", "sent_at")
    search_fields = ("user__username", "user__email", "alert__name")
    raw_id_fields = ("user", "alert")
    date_hierarchy = "sent_at"
