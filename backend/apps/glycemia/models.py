# apps/glycemia/models.py
import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


# -------------------------
# GLYCEMIA (cache 30 jours)
# -------------------------
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

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="glycemia_month",
    )

    # NEW: lien optionnel vers un device (capteur / source)
    device = models.ForeignKey(
        "devices.Device",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="glycemia_cache",
    )

    measured_at = models.DateTimeField()
    value = models.FloatField()
    unit = models.CharField(max_length=10, default="mg/dL")
    trend = models.CharField(max_length=20, choices=TREND_CHOICES, null=True, blank=True)
    rate = models.FloatField(null=True, blank=True, help_text="mg/dL per minute")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")

    class Meta:
        db_table = "glycemia"
        ordering = ["-measured_at"]
        indexes = [
            models.Index(fields=["user", "measured_at"]),
            models.Index(fields=["user", "device", "measured_at"]),
        ]

    def __str__(self):
        return f"{getattr(self.user, 'email', self.user_id)} - {self.value} {self.unit}"


# -------------------------
# GLYCEMIA HISTO (historique complet)
# -------------------------
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

    # NEW: lien optionnel vers un device
    device = models.ForeignKey(
        "devices.Device",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="glycemia_histo",
    )

    measured_at = models.DateTimeField(db_index=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    value = models.FloatField()
    unit = models.CharField(max_length=10, default="mg/dL")
    trend = models.CharField(max_length=20, choices=TREND_CHOICES, null=True, blank=True)
    rate = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")

    context = models.CharField(max_length=30, choices=CONTEXT_CHOICES, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    # Si tu veux réduire la surface RGPD plus tard, tu pourras supprimer ces champs
    photo_url = models.URLField(blank=True, null=True)
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "glycemia_histo"
        ordering = ["-measured_at"]
        indexes = [
            models.Index(fields=["user", "measured_at"]),
            models.Index(fields=["user", "source", "measured_at"]),
            models.Index(fields=["user", "device", "measured_at"]),
        ]
        # Recommandé si tu as des doublons en stream (à activer seulement si tu maîtrises measured_at)
        # constraints = [
        #     models.UniqueConstraint(
        #         fields=["user", "measured_at", "source", "device"],
        #         name="uniq_glycemia_histo_user_time_src_device",
        #     )
        # ]

    def __str__(self):
        return f"{getattr(self.user, 'email', self.user_id)} - {self.value} {self.unit} at {self.measured_at}"


# -------------------------
# IA (1 ligne = 1 run)
# -------------------------
class PredictionSource(models.TextChoices):
    BASELINE = "baseline", "Baseline"
    ML = "ml", "ML"


class PredictionStatus(models.TextChoices):
    OK = "ok", "OK"
    DEGRADED = "degraded", "Degraded"
    FAILED = "failed", "Failed"


class GlycemiaDataIA(models.Model):
    """
    1 ligne = 1 run IA (multi-horizon 15/30/60)
    Contient: prédictions + risques + audit technique (pas de table audit séparée).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="glycemia_ai",
        db_index=True,
    )

    # Optionnel: device utilisé pour ce run (si tu veux scorer par device)
    device = models.ForeignKey(
        "devices.Device",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="glycemia_ai_runs",
    )

    # Temps
    for_time = models.DateTimeField(db_index=True)  # t (moment de référence)
    input_start = models.DateTimeField()            # ex: t-2h
    input_end = models.DateTimeField()              # ex: t
    created_at = models.DateTimeField(auto_now_add=True)

    # Versioning / origine
    model_version = models.CharField(max_length=64, db_index=True)
    source = models.CharField(
        max_length=16,
        choices=PredictionSource.choices,
        default=PredictionSource.BASELINE,
        db_index=True,
    )

    # Audit technique
    features_hash = models.CharField(max_length=64, blank=True, null=True)
    input_readings_count = models.PositiveIntegerField(blank=True, null=True)
    missing_ratio = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="1 - (count / expected_count) sur la fenêtre input",
    )
    status = models.CharField(
        max_length=16,
        choices=PredictionStatus.choices,
        default=PredictionStatus.OK,
        db_index=True,
    )
    runtime_ms = models.PositiveIntegerField(blank=True, null=True)
    meta_json = models.JSONField(blank=True, null=True)

    # Prédictions (mg/dL) + incertitude (p10/p90)
    y_hat_15 = models.FloatField(blank=True, null=True)
    p10_15 = models.FloatField(blank=True, null=True)
    p90_15 = models.FloatField(blank=True, null=True)

    y_hat_30 = models.FloatField(blank=True, null=True)
    p10_30 = models.FloatField(blank=True, null=True)
    p90_30 = models.FloatField(blank=True, null=True)

    y_hat_60 = models.FloatField(blank=True, null=True)
    p10_60 = models.FloatField(blank=True, null=True)
    p90_60 = models.FloatField(blank=True, null=True)

    # Risques (0..1) pour alerting prédictif
    risk_hypo_15 = models.FloatField(
        blank=True, null=True, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    risk_hyper_15 = models.FloatField(
        blank=True, null=True, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )

    risk_hypo_30 = models.FloatField(
        blank=True, null=True, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    risk_hyper_30 = models.FloatField(
        blank=True, null=True, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )

    risk_hypo_60 = models.FloatField(
        blank=True, null=True, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    risk_hyper_60 = models.FloatField(
        blank=True, null=True, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )

    # UI (optionnel)
    recommendation = models.TextField(blank=True, null=True)
    confidence = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Confiance agrégée (0..1), optionnel",
    )

    class Meta:
        db_table = "glycemia_data_ia"
        ordering = ["-for_time"]
        indexes = [
            models.Index(fields=["user", "-for_time"]),
            models.Index(fields=["user", "device", "-for_time"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "for_time", "model_version"],
                name="uniq_glycemia_ia_run_user_time_model",
            )
        ]

    def __str__(self):
        return f"AI run {getattr(self.user, 'email', self.user_id)} @ {self.for_time} ({self.model_version})"
