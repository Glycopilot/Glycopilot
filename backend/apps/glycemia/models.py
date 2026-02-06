import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


# Cache temps réel (30 jours)
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
    trend = models.CharField(
        max_length=20, choices=TREND_CHOICES, null=True, blank=True
    )
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
        return f"{self.user.email} - {self.value} {self.unit}"


# Historique complet (jamais supprimé)
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
            models.Index(fields=["user", "device", "measured_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.value} {self.unit} at {self.measured_at}"


# ──────────────────────────────────────────────────────────
# Sorties des modèles prédictifs IA
# 1 ligne = 1 run de prédiction (multi-horizon : 15 / 30 / 60 min)
# ──────────────────────────────────────────────────────────


class PredictionSource(models.TextChoices):
    BASELINE = "baseline", "Baseline"
    LSTM = "lstm", "LSTM"
    TRANSFORMER = "transformer", "Transformer"
    ENSEMBLE = "ensemble", "Ensemble"


class PredictionStatus(models.TextChoices):
    OK = "ok", "OK"
    LOW_CONFIDENCE = "low_confidence", "Low Confidence"
    INSUFFICIENT_DATA = "insufficient_data", "Insufficient Data"
    ERROR = "error", "Error"


class GlycemiaDataIA(models.Model):
    """
    1 row = 1 run de prédiction IA (multi-horizon : 15 / 30 / 60 min).
    Contient : prédictions point + intervalles de confiance + scores de risque
    + métadonnées du modèle + champs d'audit des données d'entrée.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ── Liens ──
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="glycemia_ai",
        db_index=True,
    )

    device = models.ForeignKey(
        "devices.Device",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="glycemia_ai_runs",
    )

    # ── Références temporelles ──
    for_time = models.DateTimeField(
        db_index=True,
        help_text="Instant de référence prédit (t=0)",
    )
    input_start = models.DateTimeField(
        help_text="Début de la fenêtre d'entrée (ex : t − 2 h)",
    )
    input_end = models.DateTimeField(
        help_text="Fin de la fenêtre d'entrée (ex : t)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # ── Métadonnées du modèle ──
    model_version = models.CharField(max_length=64, db_index=True)
    source = models.CharField(
        max_length=16,
        choices=PredictionSource.choices,
        default=PredictionSource.BASELINE,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=PredictionStatus.choices,
        default=PredictionStatus.OK,
        db_index=True,
    )
    runtime_ms = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Durée de la prédiction en millisecondes",
    )
    confidence = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Score de confiance global agrégé (0..1)",
    )

    # ── Audit des données d'entrée ──
    input_readings_count = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Nombre de lectures de glycémie utilisées en entrée",
    )
    missing_ratio = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Ratio de données manquantes dans la fenêtre (0..1)",
    )
    features_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="Hash du vecteur de features pour reproductibilité",
    )

    # ── Prédictions multi-horizon (mg/dL) ──
    # Horizon 15 min
    y_hat_15 = models.FloatField(blank=True, null=True)
    p10_15 = models.FloatField(blank=True, null=True)
    p90_15 = models.FloatField(blank=True, null=True)

    # Horizon 30 min
    y_hat_30 = models.FloatField(blank=True, null=True)
    p10_30 = models.FloatField(blank=True, null=True)
    p90_30 = models.FloatField(blank=True, null=True)

    # Horizon 60 min
    y_hat_60 = models.FloatField(blank=True, null=True)
    p10_60 = models.FloatField(blank=True, null=True)
    p90_60 = models.FloatField(blank=True, null=True)

    # ── Scores de risque par horizon (0..1) ──
    risk_hypo_15 = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )
    risk_hyper_15 = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )
    risk_hypo_30 = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )
    risk_hyper_30 = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )
    risk_hypo_60 = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )
    risk_hyper_60 = models.FloatField(
        blank=True,
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )

    # ── Sortie ──
    recommendation = models.TextField(blank=True, null=True)
    meta_json = models.JSONField(blank=True, null=True)

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
                name="uniq_glycemia_ia_user_time_model",
            ),
        ]

    def __str__(self):
        return f"AI run {self.user.email} " f"@ {self.for_time} ({self.model_version})"
