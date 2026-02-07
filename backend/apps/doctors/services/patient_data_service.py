from datetime import timedelta

from django.utils import timezone

from apps.activities.models import UserActivity
from apps.alerts.models import AlertEvent, AlertSeverity
from apps.dashboard.services import HealthScoreService
from apps.glycemia.models import Glycemia, GlycemiaHisto
from apps.meals.models import UserMeal
from apps.medications.models import UserMedication


class DoctorPatientDataService:
    """
    Service dédié à la récupération des données patient pour les MÉDECINS.
    Isole la logique du Dashboard Patient pour garantir l'indépendance.
    """

    @staticmethod
    def get_patient_dashboard(patient_user) -> dict:
        """
        Agrège un résumé des données de santé du patient pour le médecin.
        """
        return {
            "glucose": DoctorPatientDataService._get_glucose_data(patient_user),
            "alerts": DoctorPatientDataService._get_alerts_data(patient_user),
            "medication": DoctorPatientDataService._get_medication_data(patient_user),
            "nutrition": DoctorPatientDataService._get_nutrition_data(patient_user),
            "activity": DoctorPatientDataService._get_activity_data(patient_user),
            "healthScore": HealthScoreService.calculate(patient_user),
        }

    @staticmethod
    def _get_glucose_data(user) -> dict | None:
        latest = Glycemia.objects.filter(user=user).order_by("-measured_at").first()
        if not latest:
            return None

        return {
            "value": latest.value,
            "unit": latest.unit,
            "trend": latest.trend,
            "recordedAt": latest.measured_at,
        }

    @staticmethod
    def _get_alerts_data(user) -> list:
        # Récupère les 3 dernières alertes déclenchées/envoyées
        alerts = AlertEvent.objects.filter(
            user=user, status__in=["TRIGGERED", "SENT"]
        ).order_by("-rule__severity", "-triggered_at")[:3]

        result = []
        severity_map = {
            AlertSeverity.CRITICAL: "critical",
            AlertSeverity.HIGH: "high",
            AlertSeverity.MEDIUM: "medium",
            AlertSeverity.LOW: "low",
            AlertSeverity.INFO: "info",
        }

        for alert in alerts:
            result.append(
                {
                    "alertId": str(alert.id),
                    "type": alert.rule.code.lower(),
                    "severity": severity_map.get(alert.rule.severity, "medium"),
                    "triggeredAt": alert.triggered_at,
                }
            )

        return result

    @staticmethod
    def _get_medication_data(user) -> dict:
        next_dose = (
            UserMedication.objects.filter(user=user, statut=True, taken_at__isnull=True)
            .select_related("medication")
            .order_by("start_date")
            .first()
        )

        if not next_dose:
            return {"nextDose": None}

        return {
            "nextDose": {
                "name": next_dose.medication.name,
                "dosage": next_dose.medication.dosage,
                "status": "pending",
            }
        }

    @staticmethod
    def _get_nutrition_data(user) -> dict:
        since = timezone.now() - timedelta(hours=24)
        meals = UserMeal.objects.filter(user=user, taken_at__gte=since).select_related(
            "meal"
        )

        total_calories = 0
        total_carbs = 0

        for user_meal in meals:
            if user_meal.meal.calories:
                total_calories += user_meal.meal.calories
            if user_meal.meal.glucose:
                total_carbs += int(user_meal.meal.glucose)

        return {
            "calories": {"consumed": total_calories, "goal": 1800},
            "carbs": {"grams": total_carbs, "goal": 200},
        }

    @staticmethod
    def _get_activity_data(user) -> dict:
        today = timezone.now().date()
        activities = UserActivity.objects.filter(user=user, start__date=today)

        total_minutes = 0
        for activity in activities:
            duration = (activity.end - activity.start).total_seconds() / 60
            total_minutes += duration

        return {
            "steps": {"value": 0, "goal": 8000},
            "activeMinutes": int(total_minutes),
        }

    @staticmethod
    def get_glycemia_history(user, limit=50) -> list:
        history = GlycemiaHisto.objects.filter(user=user).order_by("-measured_at")[
            :limit
        ]
        return [
            {
                "value": h.value,
                "unit": h.unit,
                "trend": h.trend,
                "rate": h.rate,
                "context": h.context,
                "measuredAt": h.measured_at,
                "source": h.source,
                "notes": h.notes,
                "photo": h.photo_url,
                "location": {"lat": h.location_lat, "lng": h.location_lng}
                if h.location_lat and h.location_lng
                else None,
            }
            for h in history
        ]

    @staticmethod
    def get_meals_history(user, limit=50) -> list:
        meals = (
            UserMeal.objects.filter(user=user)
            .select_related("meal")
            .order_by("-taken_at")[:limit]
        )
        return [
            {
                "name": m.meal.name,
                "calories": m.meal.calories,
                "carbs": m.meal.glucose,
                "takenAt": m.taken_at,
                "photo": m.meal.link_photo,
            }
            for m in meals
        ]

    @staticmethod
    def get_medications_history(user, limit=50) -> list:
        meds = (
            UserMedication.objects.filter(user=user)
            .select_related("medication")
            .order_by("-taken_at")[:limit]
        )
        return [
            {
                "name": m.medication.name,
                "dosage": m.medication.dosage,
                "takenAt": m.taken_at,
                "status": m.statut,
            }
            for m in meds
        ]
