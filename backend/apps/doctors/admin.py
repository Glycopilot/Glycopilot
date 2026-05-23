import logging

from django.contrib import admin, messages

from apps.auth.email_smtp import send_doctor_validation_email
from apps.doctors.verification_service import verify_doctor_profile

from .models import (
    DoctorProfile,
    InvitationStatus,
    PatientCareTeam,
    Specialty,
    VerificationStatus,
)

logger = logging.getLogger(__name__)


@admin.action(
    description="Valider la licence médecin (VERIFIED) — requis pour la connexion au portail"
)
def validate_doctors(modeladmin, request, queryset):
    count = 0
    for doctor in queryset.select_related(
        "profile__user__auth_account", "verification_status"
    ):
        if not verify_doctor_profile(doctor, verified_by=request.user):
            continue

        try:
            account = doctor.profile.user.auth_account
            identity = doctor.profile.user
            name = f"{identity.first_name} {identity.last_name}".strip() or account.email
            send_doctor_validation_email(user_email=account.email, doctor_name=name)
        except Exception:
            logger.exception("Failed to send validation email for doctor %s", doctor.pk)

        count += 1

    modeladmin.message_user(
        request,
        f"{count} médecin(s) validé(s) (statut VERIFIED). Ils peuvent se connecter au portail.",
        level=messages.SUCCESS,
    )


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


@admin.register(VerificationStatus)
class VerificationStatusAdmin(admin.ModelAdmin):
    list_display = ("label",)


@admin.register(InvitationStatus)
class InvitationStatusAdmin(admin.ModelAdmin):
    list_display = ("label",)


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ("license_number", "get_user", "specialty", "verification_status", "verified_at")
    list_filter = ("verification_status", "specialty")
    raw_id_fields = ("profile", "verified_by_user")
    actions = [validate_doctors]

    def get_user(self, obj):
        return obj.profile.user

    get_user.short_description = "User"


@admin.register(PatientCareTeam)
class PatientCareTeamAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour PatientCareTeam."""

    list_display = ("patient_profile", "member_profile", "role", "status")
    list_filter = ("status", "role")
    raw_id_fields = ("patient_profile", "member_profile", "approved_by")
    search_fields = (
        "patient_profile__profile__user__email",
        "member_profile__user__email",
    )
