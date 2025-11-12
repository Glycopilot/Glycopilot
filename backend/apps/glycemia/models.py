from django.conf import settings
from django.db import models


class Glycemia(models.Model):
    """Dernière valeur (optionnel, si tu veux un cache ‘current’)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True
    )
    measured_at = models.DateTimeField()
    value = models.FloatField()

    class Meta:
        db_table = "glycemia"


class GlycemiaHisto(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="glycemia_histo",
    )
    measured_at = models.DateTimeField(db_index=True)
    value = models.FloatField()

    class Meta:
        db_table = "glycemia_histo"
        indexes = [models.Index(fields=["user", "measured_at"])]


class GlycemiaDataIA(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="glycemia_ai"
    )
    measured_at = models.DateTimeField(db_index=True)
    value = models.FloatField()

    class Meta:
        db_table = "glycemia_data_ia"
        indexes = [models.Index(fields=["user", "measured_at"])]
