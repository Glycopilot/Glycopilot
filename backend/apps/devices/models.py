import uuid

from django.conf import settings
from django.db import models


class Device(models.Model):
    class DeviceType(models.TextChoices):
        CGM = "cgm", "CGM"
        MANUAL = "manual", "Manual"
        SIMULATOR = "simulator", "Simulator"

    class Provider(models.TextChoices):
        DEXCOM = "dexcom", "Dexcom"
        FREESTYLE = "freestyle", "FreeStyle Libre"
        SIMULATOR = "simulator", "Simulator"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Tu utilises AUTH_USER_MODEL = AuthAccount (compte d'auth)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="devices",
        db_index=True,
    )

    # Affichage / identification
    name = models.CharField(max_length=100)  # ex: "Dexcom G6", "Libre 3"
    device_type = models.CharField(
        max_length=20, choices=DeviceType.choices, default=DeviceType.CGM
    )
    provider = models.CharField(
        max_length=30, choices=Provider.choices, default=Provider.OTHER
    )

    model = models.CharField(max_length=80, blank=True, null=True)        # ex: "G6"
    serial_number = models.CharField(max_length=120, blank=True, null=True)

    # Lifecycle
    is_active = models.BooleanField(default=True, db_index=True)
    started_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)

    # Paramètres utiles IA / ingestion (optionnels mais pratiques)
    sampling_interval_sec = models.PositiveIntegerField(blank=True, null=True)  # ex: 300
    timezone = models.CharField(max_length=64, blank=True, null=True)          # ex: "Europe/Paris" (mais readings en UTC)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "devices"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["provider", "device_type"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.provider})"
