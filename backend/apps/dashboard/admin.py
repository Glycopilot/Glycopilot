from django.contrib import admin
from .models import UserWidget, UserWidgetLayout


@admin.register(UserWidget)
class UserWidgetAdmin(admin.ModelAdmin):
    list_display = ("user", "widget_id", "visible", "refresh_interval", "last_refreshed_at")
    list_filter = ("visible", "widget_id")
    search_fields = ("user__email", "widget_id")


@admin.register(UserWidgetLayout)
class UserWidgetLayoutAdmin(admin.ModelAdmin):
    list_display = ("user", "widget_id", "column", "row", "size", "pinned")
    list_filter = ("size", "pinned", "widget_id")
    search_fields = ("user__email", "widget_id")
