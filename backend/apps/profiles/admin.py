from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Profile."""

    list_display = ("nom",)
    search_fields = ("nom",)
    ordering = ("nom",)
