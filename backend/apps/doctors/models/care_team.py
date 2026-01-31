import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.profiles.models import PatientProfile, Profile

from .doctor_profile import DoctorProfile
from .status import InvitationStatus


class PatientCareTeam(models.Model):
    class TeamRole(models.TextChoices):
        REFERENT_DOCTOR = "REFERENT_DOCTOR", _("Referent Doctor")
        SPECIALIST = "SPECIALIST", _("Specialist")
        NURSE = "NURSE", _("Nurse")
        FAMILY = "FAMILY", _("Family")
        CAREGIVER = "CAREGIVER", _("Caregiver")

    id_team_member = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )

    patient_profile = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="care_team_members",
        verbose_name=_("Patient"),
    )

    member_profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="care_teams_as_member",
        verbose_name=_("Team Member (Doctor/Family)"),
        null=True,
        blank=True,
    )

    invitation_email = models.EmailField(
        blank=True, null=True, verbose_name=_("Invitation Email (for Pending Doctors)")
    )

    relation_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Relation Type (e.g. Father, Mother)"),
    )

    role = models.CharField(
        max_length=50, choices=TeamRole.choices, verbose_name=_("Role in Team")
    )

    status = models.ForeignKey(
        InvitationStatus,
        on_delete=models.PROTECT,
        related_name="care_team_entries",
        default=1,
    )

    approved_by = models.ForeignKey(
        DoctorProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_care_team_members",
        verbose_name=_("Approved By (Doctor)"),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patient_care_team"
        # unique_together cannot be used directly if member_profile is null.
        # Ideally we want unique(patient, member) AND unique(patient, invitation_email)
        # For simplicity, we'll remove the strict DB constraint here and enforce in validation/signals
        # OR use functional unique constraints (Django 2.2+), but let's just remove it for now to avoid complexity during migration
        verbose_name = _("Patient Care Team Member")
        verbose_name_plural = _("Patient Care Team")

    def __str__(self):
        member_str = (
            self.member_profile.user if self.member_profile else self.invitation_email
        )
        return f"{member_str} ({self.role}) for {self.patient_profile.profile.user}"
