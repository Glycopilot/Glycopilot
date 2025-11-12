from django.contrib import admin
from .models import Alert

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "alert_type", "message", "is_resolved")
    list_filter = ("alert_type", "is_resolved")
