import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.profiles.models import Profile

class DoctorProfile(models.Model):
    doctor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.OneToOneField(
        Profile,
        on_delete=models.CASCADE,
        related_name="doctor_profile",
        limit_choices_to={"role__name": "DOCTOR"},
    )
    license_number = models.CharField(max_length=50, unique=True)
    
    verification_status = models.ForeignKey(
        "doctors.VerificationStatus",
        on_delete=models.PROTECT,
        related_name="doctors",
        default=1 
    )
    
    verified_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="validated_doctors",
        db_column="verified_by_user_id",
    )
    rejection_reason = models.TextField(blank=True, null=True)
    
    medical_center_name = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        verbose_name="Nom du Cabinet / Hôpital"
    )
    medical_center_address = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        verbose_name="Adresse du Cabinet / Hôpital"
    )

    specialty = models.ForeignKey(
        "doctors.Specialty",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctors",
        verbose_name=_("Specialty")
    )

    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "doctor_profiles"
        verbose_name = _("Doctor Profile")
        verbose_name_plural = _("Doctor Profiles")

    def __str__(self):
        return f"Dr. {self.license_number}"
