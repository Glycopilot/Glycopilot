import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from .profile import Profile

class PatientProfile(models.Model):
    class DiabetesType(models.TextChoices):
        TYPE1 = "TYPE1", _("Type 1")
        TYPE2 = "TYPE2", _("Type 2")
        GESTATIONAL = "GESTATIONAL", _("Gestational")

    id_patient = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.OneToOneField(
        Profile,
        on_delete=models.CASCADE,
        related_name="patient_profile",
        limit_choices_to={"role__name": "PATIENT"},
    )
    diabetes_type = models.CharField(
        max_length=20,
        choices=DiabetesType.choices,
        blank=True,
        null=True,
        verbose_name=_("Diabetes Type")
    )
    diagnosis_date = models.DateField(null=True, blank=True, verbose_name=_("Diagnosis Date"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patient_profiles"
        verbose_name = _("Patient Profile")
        verbose_name_plural = _("Patient Profiles")

    def __str__(self):
        return f"Patient: {self.profile.user}"
