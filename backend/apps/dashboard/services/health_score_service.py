from datetime import timedelta
from django.db.models import Avg, Count
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
            return 50.0

        total = readings.count()
        in_range = readings.filter(
            value__gte=cls.GLYCEMIA_TARGET_MIN, value__lte=cls.GLYCEMIA_TARGET_MAX
        ).count()

        tir = (in_range / total) * 100
        return min(100, tir)

    @classmethod
    def _calculate_adherence_score(cls, user) -> float:
        """
        Score basé sur l'observance médicamenteuse.
        """
        from apps.medications.models import UserMedication

        since = timezone.now() - timedelta(days=7)
        medications = UserMedication.objects.filter(
            user=user, start_date__lte=timezone.now().date(), statut=True
        )

        if not medications.exists():
            return 100.0

        taken = medications.filter(taken_at__gte=since).count()
        total = medications.count() * 7

        if total == 0:
            return 100.0

        return min(100, (taken / total) * 100)

    @classmethod
    def _calculate_nutrition_score(cls, user) -> float:
        """
        Score basé sur la régularité des repas.
        """
        from apps.meals.models import UserMeal

        since = timezone.now() - timedelta(days=7)
        meals = UserMeal.objects.filter(user=user, taken_at__gte=since)

        if not meals.exists():
            return 50.0

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
            return 30.0

        total_minutes = 0
        for activity in activities:
            duration = (activity.end - activity.start).total_seconds() / 60
            total_minutes += duration

        avg_daily_minutes = total_minutes / 7
        target_minutes = 30

        return min(100, (avg_daily_minutes / target_minutes) * 100)
