from datetime import timedelta

from django.utils import timezone


class HealthScoreService:
    """
    Calcule le score de santé 0-100.
    Pondération: glycémie 40%, observance 20%, nutrition 20%, activité 20%.
    """

    WEIGHT_GLYCEMIA = 0.40
    WEIGHT_ADHERENCE = 0.20
    WEIGHT_NUTRITION = 0.20
    WEIGHT_ACTIVITY = 0.20

    GLYCEMIA_TARGET_MIN = 70
    GLYCEMIA_TARGET_MAX = 180

    @classmethod
    def calculate(cls, user) -> int:
        glycemia_score = cls._calculate_glycemia_score(user)
        adherence_score = cls._calculate_adherence_score(user)
        nutrition_score = cls._calculate_nutrition_score(user)
        activity_score = cls._calculate_activity_score(user)

        total = (
            glycemia_score * cls.WEIGHT_GLYCEMIA
            + adherence_score * cls.WEIGHT_ADHERENCE
            + nutrition_score * cls.WEIGHT_NUTRITION
            + activity_score * cls.WEIGHT_ACTIVITY
        )

        return round(total)

    @classmethod
    def _calculate_glycemia_score(cls, user) -> float:
        """
        Score basé sur le Time In Range (TIR) des dernières 24h.
        """
        from apps.glycemia.models import Glycemia

        since = timezone.now() - timedelta(hours=24)
        readings = Glycemia.objects.filter(user=user, measured_at__gte=since)

        if not readings.exists():
            return 70.0  # Neutre — pas de données ne signifie pas mauvaise glycémie

        total = readings.count()
        in_range = readings.filter(
            value__gte=cls.GLYCEMIA_TARGET_MIN, value__lte=cls.GLYCEMIA_TARGET_MAX
        ).count()

        tir = (in_range / total) * 100
        return min(100, tir)

    @classmethod
    def _calculate_adherence_score(cls, user) -> float:
        """
        Score basé sur l'observance médicamenteuse via MedicationIntake.
        """
        from django.db.models import Q
        from apps.medications.models import IntakeStatus, MedicationIntake, UserMedication

        today = timezone.now().date()
        since = today - timedelta(days=7)

        active_meds = UserMedication.objects.filter(
            user=user,
            start_date__lte=today,
            statut=True,
        ).filter(Q(end_date__isnull=True) | Q(end_date__gte=today))

        if not active_meds.exists():
            return 100.0

        expected = MedicationIntake.objects.filter(
            user_medication__in=active_meds,
            scheduled_date__gte=since,
            scheduled_date__lte=today,
        ).count()

        if expected == 0:
            return 100.0

        taken = MedicationIntake.objects.filter(
            user_medication__in=active_meds,
            scheduled_date__gte=since,
            scheduled_date__lte=today,
            status=IntakeStatus.TAKEN,
        ).count()

        return min(100.0, (taken / expected) * 100)

    @classmethod
    def _calculate_nutrition_score(cls, user) -> float:
        """
        Score basé sur la régularité des repas.
        """
        from apps.meals.models import UserMeal

        since = timezone.now() - timedelta(days=7)
        meals = UserMeal.objects.filter(user=user, taken_at__gte=since)

        if not meals.exists():
            return 70.0  # Neutre — pas de données ne signifie pas mauvaise nutrition

        meals_per_day = meals.count() / 7
        ideal_meals = 3

        ratio = meals_per_day / ideal_meals
        if ratio > 1:
            ratio = 1 - (ratio - 1) * 0.5

        return min(100, max(0, ratio * 100))

    @classmethod
    def _calculate_activity_score(cls, user) -> float:
        """
        Score basé sur l'activité physique.
        """
        from apps.activities.models import UserActivity

        since = timezone.now() - timedelta(days=7)
        activities = UserActivity.objects.filter(user=user, start__gte=since)

        if not activities.exists():
            return 60.0  # Neutre — pas de données ne signifie pas sédentarité

        total_minutes = 0
        for activity in activities:
            duration = (activity.end - activity.start).total_seconds() / 60
            total_minutes += duration

        avg_daily_minutes = total_minutes / 7
        target_minutes = 30

        return min(100, (avg_daily_minutes / target_minutes) * 100)
