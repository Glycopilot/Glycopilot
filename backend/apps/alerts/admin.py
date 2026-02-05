from django.contrib import admin

from .models import AlertEvent, AlertRule, UserAlertRule


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "severity",
        "min_glycemia",
        "max_glycemia",
        "is_active",
    )
    list_filter = ("severity", "is_active")
    search_fields = ("code", "name", "description")
    ordering = ("severity", "code")


@admin.register(UserAlertRule)
class UserAlertRuleAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "rule",
        "enabled",
        "cooldown_seconds",
        "min_glycemia_override",
        "max_glycemia_override",
    )
    list_filter = ("enabled", "rule")
    search_fields = ("user__username", "user__email", "rule__code", "rule__name")
    raw_id_fields = ("user", "rule")


@admin.register(AlertEvent)
class AlertEventAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "rule",
        "glycemia_value",
        "status",
        "triggered_at",
        "push_sent_at",
        "acked_at",
        "resolved_at",
    )
    list_filter = ("status", "rule")
    search_fields = ("user__username", "user__email", "rule__code", "rule__name")
    raw_id_fields = ("user", "rule")
    date_hierarchy = "triggered_at"
    ordering = ("-triggered_at",)
