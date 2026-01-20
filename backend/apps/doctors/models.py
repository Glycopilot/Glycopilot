from django.conf import settings
from django.db import models


class Doctor(models.Model):
    licence_number = models.CharField(primary_key=True, max_length=50)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="doctor_profile",
    )
    adresse_pro = models.TextField(blank=True, null=True)
    valide = models.BooleanField(default=False)
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="validated_doctors",
    )


    class Meta:
        db_table = "doctors"


