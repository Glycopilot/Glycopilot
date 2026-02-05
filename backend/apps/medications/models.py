from django.conf import settings
from django.db import models


class Medication(models.Model):
    medication_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    type = models.CharField(max_length=100, blank=True, null=True)
    dosage = models.CharField(max_length=100, blank=True, null=True)
    interval_h = models.IntegerField(blank=True, null=True)
    max_duration_d = models.IntegerField(blank=True, null=True)

    class Meta:
        db_table = "medications"


class UserMedication(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_medications",
    )
    medication = models.ForeignKey(
        Medication, on_delete=models.CASCADE, related_name="user_medications"
    )
    start_date = models.DateField()
    taken_at = models.DateTimeField(blank=True, null=True)
    statut = models.BooleanField(default=True)

    class Meta:
        db_table = "user_medications"
