import logging
from datetime import datetime, timezone

from django.contrib import admin, messages

from apps.auth.email_smtp import send_doctor_validation_email

from .models import (
    DoctorProfile,
    InvitationStatus,
    PatientCareTeam,
    Specialty,
    VerificationStatus,
)

logger = logging.getLogger(__name__)


@admin.action(description="Valider les médecins sélectionnés et les notifier par email")
def validate_doctors(modeladmin, request, queryset):
    try:
        verified_status = VerificationStatus.objects.get(label="VERIFIED")
    except VerificationStatus.DoesNotExist:
        modeladmin.message_user(
            request,
            "Statut VERIFIED introuvable en base.",
            level=messages.ERROR,
        )
        return

    now = datetime.now(tz=timezone.utc)
    count = 0
    for doctor in queryset.select_related("profile__user__user"):
        if doctor.verification_status == verified_status:
            continue
        doctor.verification_status = verified_status
        doctor.verified_by_user = request.user
        doctor.verified_at = now
        doctor.save(update_fields=["verification_status", "verified_by_user", "verified_at"])

        try:
            auth = doctor.profile.user
            identity = auth.user
            name = f"{identity.first_name} {identity.last_name}".strip() or auth.email
            send_doctor_validation_email(user_email=auth.email, doctor_name=name)
        except Exception:
            logger.exception("Failed to send validation email for doctor %s", doctor.pk)

        count += 1

    modeladmin.message_user(
        request,
        f"{count} médecin(s) validé(s) et notifié(s) par email.",
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
