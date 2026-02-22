from django.contrib import admin

from .models import PatientProfile, Profile


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ("get_user", "diabetes_type", "diagnosis_date")
    list_filter = ("diabetes_type",)
    search_fields = ("profile__user__email", "profile__user__last_name")

    def get_user(self, obj):
        return obj.profile.user

    get_user.short_description = "User"


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Profile."""

    list_display = ("user", "role", "label", "is_active", "created_at")
    list_filter = ("role", "is_active", "created_at")
    search_fields = ("user__email", "user__first_name", "user__last_name", "label")
    ordering = ("user", "role")
    raw_id_fields = ("user",)
