from django.contrib import admin
from .models import Device


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("name", "provider", "device_type", "user", "is_active", "created_at")
    list_filter = ("provider", "device_type", "is_active")
    search_fields = ("name", "model", "serial_number", "user__email")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)
