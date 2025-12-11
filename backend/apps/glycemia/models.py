import uuid

from django.conf import settings
from django.db import models


# Cache temps réel
class Glycemia(models.Model):
    TREND_CHOICES = [
        ("rising", "Rising"),
        ("falling", "Falling"),
        ("flat", "Flat"),
    ]

    SOURCE_CHOICES = [
        ("cgm", "CGM"),
        ("manual", "Manual"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True
    )
    measured_at = models.DateTimeField()
    value = models.FloatField()
    unit = models.CharField(max_length=10, default="mg/dL")
    trend = models.CharField(
        max_length=20, choices=TREND_CHOICES, null=True, blank=True
    )
    rate = models.FloatField(null=True, blank=True, help_text="mg/dL per minute")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")

    class Meta:
        db_table = "glycemia"

    def __str__(self):
        return f"{self.user.email} - {self.value} {self.unit}"


class GlycemiaHisto(models.Model):
    TREND_CHOICES = [
        ("rising", "Rising"),
        ("falling", "Falling"),
        ("flat", "Flat"),
    ]

    SOURCE_CHOICES = [
        ("cgm", "CGM"),
        ("manual", "Manual"),
    ]

    CONTEXT_CHOICES = [
        ("fasting", "Fasting"),
        ("preprandial", "Preprandial"),
        ("postprandial_1h", "Postprandial 1h"),
        ("postprandial_2h", "Postprandial 2h"),
        ("bedtime", "Bedtime"),
        ("exercise", "Exercise"),
        ("stress", "Stress"),
        ("correction", "Correction"),
    ]

    id = models.BigAutoField(primary_key=True)
    reading_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="glycemia_histo",
    )

    measured_at = models.DateTimeField(db_index=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    value = models.FloatField()
    unit = models.CharField(max_length=10, default="mg/dL")
    trend = models.CharField(
        max_length=20, choices=TREND_CHOICES, null=True, blank=True
    )
    rate = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")

    context = models.CharField(
        max_length=30, choices=CONTEXT_CHOICES, null=True, blank=True
    )
    notes = models.TextField(blank=True, null=True)
    photo_url = models.URLField(blank=True, null=True)
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "glycemia_histo"
        ordering = ["-measured_at"]
        indexes = [
            models.Index(fields=["user", "measured_at"]),
            models.Index(fields=["user", "source", "measured_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.value} {self.unit} at {self.measured_at}"


class GlycemiaDataIA(models.Model):
    """
    Données générées par l'IA
    Aligné avec l’UML :
    - created_at
    - prediction_start / prediction_end
    - prob_hypo / prob_hyper
    - recommendation
    - model_version
    """

    id = models.BigAutoField(primary_key=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="glycemia_ai"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    prediction_start = models.DateTimeField(null=True, blank=True)
    prediction_end = models.DateTimeField(null=True, blank=True)

    prob_hypo = models.FloatField(null=True, blank=True)
    prob_hyper = models.FloatField(null=True, blank=True)
    recommendation = models.TextField(blank=True, null=True)

    model_version = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = "glycemia_data_ia"
        indexes = [
            models.Index(fields=["user", "prediction_start"]),
            models.Index(fields=["user", "prediction_end"]),
        ]

    def __str__(self):
        return (
            f"AI - {self.user.email} ({self.prediction_start} → {self.prediction_end})"
        )
