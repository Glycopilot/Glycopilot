from django.contrib import admin, messages

from apps.doctors.verification_service import verify_doctor_profile

from .models import PatientProfile, Profile


@admin.action(
    description="Valider la licence médecin (VERIFIED) — requis pour la connexion au portail"
)
def validate_doctor_profiles(modeladmin, request, queryset):
    count = 0
    for profile in queryset.filter(role__name="DOCTOR").select_related(
        "doctor_profile__verification_status"
    ):
        if not hasattr(profile, "doctor_profile"):
            continue
        if verify_doctor_profile(profile.doctor_profile, verified_by=request.user):
            count += 1
    if count:
        modeladmin.message_user(
            request,
            f"{count} médecin(s) validé(s) (statut VERIFIED).",
            level=messages.SUCCESS,
        )
    else:
        modeladmin.message_user(
            request,
            "Aucun profil médecin à valider (déjà VERIFIED ou rôle non médecin).",
            level=messages.WARNING,
        )


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ("get_user", "diabetes_type", "diagnosis_date", "hba1c")
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
    actions = [validate_doctor_profiles]
