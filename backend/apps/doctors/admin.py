from django.contrib import admin
from .models import DoctorProfile, PatientCareTeam, VerificationStatus, InvitationStatus, Specialty

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
    list_display = ("license_number", "get_user", "specialty", "verification_status")
    list_filter = ("verification_status", "specialty")
    raw_id_fields = ("profile", "verified_by_user")
    
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
        "member_profile__user__email"
    )
