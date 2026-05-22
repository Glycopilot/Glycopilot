from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.activities.models import UserActivity
from apps.alerts.models import AlertEvent, AlertSeverity
from apps.dashboard.services import HealthScoreService
from apps.doctors.doctor_patient_access import _get_identity
from apps.glycemia.models import Glycemia, GlycemiaHisto
from apps.meals.models import UserMeal
from apps.medications.models import UserMedication


class DoctorPatientDataService:
    @staticmethod
    def get_patient_dashboard(patient_account) -> dict:
        return {
            "glucose": DoctorPatientDataService._get_glucose_data(patient_account),
            "alerts": DoctorPatientDataService._get_alerts_data(patient_account),
            "medication": DoctorPatientDataService._get_medication_data(patient_account),
            "nutrition": DoctorPatientDataService._get_nutrition_data(patient_account),
            "activity": DoctorPatientDataService._get_activity_data(patient_account),
            "hba1c": DoctorPatientDataService._get_hba1c_data(patient_account),
            "healthScore": HealthScoreService.calculate(patient_account),
        }

    @staticmethod
    def _get_glucose_data(patient_account) -> dict | None:
        latest = (
            Glycemia.objects.filter(user=patient_account)
            .order_by("-measured_at")
            .first()
        )
        if not latest:
            return None

        return {
            "value": latest.value,
            "unit": latest.unit,
            "trend": latest.trend,
            "recordedAt": latest.measured_at,
        }

    @staticmethod
    def _get_alerts_data(patient_account) -> list:
        alerts = AlertEvent.objects.filter(
            user=patient_account, status__in=["TRIGGERED", "SENT"]
        ).order_by("-rule__severity", "-triggered_at")[:3]

        severity_map = {
            AlertSeverity.CRITICAL: "critical",
            AlertSeverity.HIGH: "high",
            AlertSeverity.MEDIUM: "medium",
            AlertSeverity.LOW: "low",
            AlertSeverity.INFO: "info",
        }

        return [
            {
                "alertId": str(alert.id),
                "type": alert.rule.code.lower(),
                "severity": severity_map.get(alert.rule.severity, "medium"),
                "triggeredAt": alert.triggered_at,
            }
            for alert in alerts
        ]

    @staticmethod
    def _get_medication_data(patient_account) -> dict:
        next_dose = (
            UserMedication.objects.filter(
                user=patient_account,
                statut=True,
                taken_at__isnull=True,
                medication__isnull=False,
            )
            .select_related("medication")
            .order_by("start_date")
            .first()
        )

        if not next_dose or not next_dose.medication:
            return {"nextDose": None}

        return {
            "nextDose": {
                "name": next_dose.medication.name,
                "dosage": next_dose.medication.dosage,
                "status": "pending",
            }
        }

    @staticmethod
    def _get_nutrition_data(patient_account) -> dict:
        since = timezone.now() - timedelta(hours=24)
        meals = UserMeal.objects.filter(
            user=patient_account, taken_at__gte=since
        ).select_related("meal")

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
    def _get_activity_data(patient_account) -> dict:
        today = timezone.now().date()
        activities = UserActivity.objects.filter(
            user=patient_account, start__date=today
        )

        total_minutes = 0
        for activity in activities:
            duration = (activity.end - activity.start).total_seconds() / 60
            total_minutes += duration

        return {
            "steps": {"value": 0, "goal": 8000},
            "activeMinutes": int(total_minutes),
        }

    @staticmethod
    def _get_hba1c_data(patient_account) -> dict | None:
        identity = _get_identity(patient_account)
        if not identity:
            return None

        profile = identity.profiles.filter(role__name__iexact="PATIENT").first()
        if not profile or not hasattr(profile, "patient_profile"):
            return None

        pp = profile.patient_profile
        if pp.hba1c is None:
            return None

        measured_at = getattr(pp, "updated_at", None)
        return {
            "value": float(pp.hba1c),
            "unit": "%",
            "measuredAt": measured_at.isoformat() if measured_at else None,
        }

    @staticmethod
    def get_glycemia_history(patient_account, limit=50) -> list:
        history = GlycemiaHisto.objects.filter(user=patient_account).order_by(
            "-measured_at"
        )[:limit]
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
    def get_meals_history(patient_account, limit=50) -> list:
        meals = (
            UserMeal.objects.filter(user=patient_account)
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
    def get_medications_history(patient_account, limit=50) -> list:
        meds = (
            UserMedication.objects.filter(user=patient_account)
            .select_related("medication")
            .order_by("-taken_at")[:limit]
        )
        result = []
        for m in meds:
            if not m.medication:
                continue
            result.append(
                {
                    "name": m.medication.name,
                    "dosage": m.medication.dosage,
                    "takenAt": m.taken_at,
                    "status": m.statut,
                }
            )
        return result
