from django.db import models
from django.utils.translation import gettext_lazy as _


class VerificationStatus(models.Model):
    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "verification_statuses"
        verbose_name = _("Verification Status")
        verbose_name_plural = _("Verification Statuses")

    def __str__(self):
        return self.label


class InvitationStatus(models.Model):
    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "invitation_statuses"
        verbose_name = _("Invitation Status")
        verbose_name_plural = _("Invitation Statuses")

    def __str__(self):
        return self.label
