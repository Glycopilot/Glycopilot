from django.conf import settings
from django.db import models


class Medication(models.Model):
    medication_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=300)
    type = models.CharField(max_length=100, blank=True, null=True)
    dosage = models.CharField(max_length=100, blank=True, null=True)
    interval_h = models.IntegerField(blank=True, null=True)
    max_duration_d = models.IntegerField(blank=True, null=True)
    cis_code = models.CharField(max_length=50, blank=True, null=True, unique=True)
    form = models.CharField(max_length=150, blank=True, null=True)
    route = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        db_table = "medications"

    def __str__(self):
        return self.name


class MealTiming(models.TextChoices):
    BEFORE_MEAL = "before_meal", "Avant repas"
    AFTER_MEAL = "after_meal", "Après repas"
    ANYTIME = "anytime", "Indifférent"


class MedicationSource(models.TextChoices):
    API = "api", "Base de données (BDPM)"
    MANUAL = "manual", "Ajout manuel"
    PRESCRIBED = "prescribed", "Prescrit par médecin"


class UserMedication(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_medications",
    )
    # Reference medication (null if manual/prescribed)
    medication = models.ForeignKey(
        Medication,
        on_delete=models.SET_NULL,
        related_name="user_medications",
        blank=True,
        null=True,
    )
    # Used when medication is null (manual/prescribed)
    custom_name = models.CharField(max_length=150, blank=True, null=True)
    custom_dosage = models.CharField(max_length=100, blank=True, null=True)

    # Treatment configuration
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    doses_per_day = models.PositiveIntegerField(default=1)
    meal_timing = models.CharField(
        max_length=20,
        choices=MealTiming.choices,
        default=MealTiming.ANYTIME,
    )
    source = models.CharField(
        max_length=20,
        choices=MedicationSource.choices,
        default=MedicationSource.MANUAL,
    )
    statut = models.BooleanField(default=True)

    # Legacy field kept for backward compatibility
    taken_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_medications"

    def __str__(self):
        name = self.medication.name if self.medication else self.custom_name
        return f"{self.user} - {name}"

    @property
    def display_name(self):
        return self.medication.name if self.medication else self.custom_name

    @property
    def display_dosage(self):
        if self.medication and self.medication.dosage:
            return self.medication.dosage
        return self.custom_dosage


class MedicationSchedule(models.Model):
    """One entry per scheduled dose time for a UserMedication."""

    user_medication = models.ForeignKey(
        UserMedication,
        on_delete=models.CASCADE,
        related_name="schedules",
    )
    time = models.TimeField()
    reminder_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = "medication_schedules"
        unique_together = ("user_medication", "time")
        ordering = ["time"]

    def __str__(self):
        return f"{self.user_medication.display_name} @ {self.time}"


class IntakeStatus(models.TextChoices):
    PENDING = "pending", "En attente"
    TAKEN = "taken", "Pris"
    MISSED = "missed", "Manqué"
    SNOOZED = "snoozed", "Reporté"


class MedicationIntake(models.Model):
    """Tracks each individual dose: taken, missed, or snoozed."""

    user_medication = models.ForeignKey(
        UserMedication,
        on_delete=models.CASCADE,
        related_name="intakes",
    )
    schedule = models.ForeignKey(
        MedicationSchedule,
        on_delete=models.SET_NULL,
        related_name="intakes",
        blank=True,
        null=True,
    )
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    status = models.CharField(
        max_length=10,
        choices=IntakeStatus.choices,
        default=IntakeStatus.PENDING,
    )
    taken_at = models.DateTimeField(blank=True, null=True)
    snoozed_until = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medication_intakes"
        unique_together = ("user_medication", "scheduled_date", "scheduled_time")
        ordering = ["scheduled_date", "scheduled_time"]

    def __str__(self):
        return (
            f"{self.user_medication.display_name} - "
            f"{self.scheduled_date} {self.scheduled_time} [{self.status}]"
        )
