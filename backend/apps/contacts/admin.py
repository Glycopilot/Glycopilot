from django.contrib import admin

from .models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Contact."""

    list_display = ("name", "user", "type", "phone_number")
    list_filter = ("type",)
    search_fields = ("name", "user__username", "user__email", "phone_number")
    raw_id_fields = ("user",)
