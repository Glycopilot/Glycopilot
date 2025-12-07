"""
Service d'agrégation du dashboard.
Récupère et agrège les données de tous les modules pour le dashboard.
"""

from django.utils import timezone
from django.db.models import Sum, Count
from datetime import timedelta

from apps.glycemia.models import Glycemia, GlycemiaHisto
from apps.alerts.models import UserAlert
from apps.medications.models import UserMedication
from apps.meals.models import UserMeal, Meal
from apps.activities.models import UserActivity

from .health_score_service import calculate_health_score


def get_glucose_data(user) -> dict:
    """
    Récupère les données glycémie actuelles.
    Utilise mock data si pas de données réelles.
    """
    try:
        glycemia = Glycemia.objects.get(user=user)
        return {
            "value": glycemia.value,
            "unit": glycemia.unit,
            "trend": glycemia.trend or "flat",
            "recordedAt": glycemia.measured_at.isoformat() if glycemia.measured_at else None,
        }
    except Glycemia.DoesNotExist:
        # Mock data si pas de données
        return {
            "value": 95,
            "unit": "mg/dL",
            "trend": "flat",
            "recordedAt": timezone.now().isoformat(),
        }


def get_alerts_data(user, limit: int = 3) -> list:
    """
    Récupère les alertes critiques (top 3 par défaut).
    """
    alerts = (
        UserAlert.objects
        .filter(user=user, statut=True)
        .select_related("alert")
        .order_by("-alert__danger_level", "-sent_at")[:limit]
    )

    if not alerts.exists():
        # Mock data si pas d'alertes
        return []

    return [
        {
            "alertId": str(ua.alert.alert_id),
            "type": ua.alert.name,
            "severity": "critical" if ua.alert.danger_level >= 3 else "warning" if ua.alert.danger_level >= 2 else "info",
        }
        for ua in alerts
    ]


def get_medication_data(user) -> dict:
    """
    Récupère la prochaine prise de médicament.
    """
    now = timezone.now()

    # Trouver le prochain médicament à prendre
    next_medication = (
        UserMedication.objects
        .filter(user=user, statut=True)
        .select_related("medication")
        .first()
    )

    if not next_medication:
        # Mock data si pas de médicaments
        return {
            "nextDose": None
        }

    # Calculer la prochaine prise basée sur l'intervalle
    if next_medication.taken_at:
        interval_hours = next_medication.medication.interval_h or 8
        next_time = next_medication.taken_at + timedelta(hours=interval_hours)
    else:
        next_time = now

    return {
        "nextDose": {
            "name": next_medication.medication.name,
            "scheduledAt": next_time.isoformat(),
            "status": "pending" if next_time > now else "overdue",
        }
    }


def get_nutrition_data(user, calories_goal: int = 1800, carbs_goal: int = 200) -> dict:
    """
    Récupère les données nutrition des dernières 24h.
    """
    now = timezone.now()
    yesterday = now - timedelta(hours=24)

    # Agréger les repas des dernières 24h
    meals_data = (
        UserMeal.objects
        .filter(user=user, taken_at__gte=yesterday)
        .select_related("meal")
        .aggregate(
            total_calories=Sum("meal__calories"),
            meal_count=Count("id")
        )
    )

    calories_consumed = meals_data["total_calories"] or 0

    # Estimer les glucides (approximation basée sur les calories)
    # En moyenne, 45-65% des calories viennent des glucides
    # 1g de glucides = 4 calories
    estimated_carbs = int((calories_consumed * 0.5) / 4) if calories_consumed > 0 else 0

    return {
        "calories": {
            "consumed": calories_consumed,
            "goal": calories_goal,
        },
        "carbs": {
            "grams": estimated_carbs,
            "goal": carbs_goal,
        }
    }


def get_activity_data(user, steps_goal: int = 8000) -> dict:
    """
    Récupère les données activité du jour.
    """
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Récupérer les activités du jour
    activities = (
        UserActivity.objects
        .filter(user=user, start__gte=today_start)
        .select_related("activity")
    )

    # Calculer les minutes actives
    total_minutes = 0
    for activity in activities:
        duration = (activity.end - activity.start).total_seconds() / 60
        total_minutes += duration

    # Mock steps (car pas de champ steps dans le modèle actuel)
    # En production, cela viendrait d'une intégration capteur
    mock_steps = int(total_minutes * 100) if total_minutes > 0 else 0

    return {
        "steps": {
            "value": mock_steps,
            "goal": steps_goal,
        },
        "activeMinutes": int(total_minutes),
    }


def get_dashboard_summary(user, include: list = None) -> dict:
    """
    Agrège toutes les données du dashboard.

    Args:
        user: L'utilisateur connecté
        include: Liste des modules à inclure (None = tous)

    Returns:
        dict: Données agrégées du dashboard
    """
    # Modules par défaut
    all_modules = ["glucose", "alerts", "medication", "nutrition", "activity"]

    if include:
        modules_to_fetch = [m for m in include if m in all_modules]
    else:
        modules_to_fetch = all_modules

    result = {}

    # Récupérer les données de chaque module
    if "glucose" in modules_to_fetch:
        result["glucose"] = get_glucose_data(user)

    if "alerts" in modules_to_fetch:
        result["alerts"] = get_alerts_data(user)

    if "medication" in modules_to_fetch:
        result["medication"] = get_medication_data(user)

    if "nutrition" in modules_to_fetch:
        result["nutrition"] = get_nutrition_data(user)

    if "activity" in modules_to_fetch:
        result["activity"] = get_activity_data(user)

    # Calculer le Health Score
    glucose_data = result.get("glucose", {})
    nutrition_data = result.get("nutrition", {})
    activity_data = result.get("activity", {})

    # Récupérer les stats médicaments pour le score
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    medication_expected = UserMedication.objects.filter(user=user, statut=True).count()
    medication_taken = UserMedication.objects.filter(
        user=user,
        statut=True,
        taken_at__gte=today_start
    ).count()

    result["healthScore"] = calculate_health_score(
        glucose_value=glucose_data.get("value"),
        glucose_unit=glucose_data.get("unit", "mg/dL"),
        medication_taken=medication_taken,
        medication_expected=medication_expected,
        calories_consumed=nutrition_data.get("calories", {}).get("consumed", 0),
        calories_goal=nutrition_data.get("calories", {}).get("goal", 1800),
        carbs_consumed=nutrition_data.get("carbs", {}).get("grams", 0),
        carbs_goal=nutrition_data.get("carbs", {}).get("goal", 200),
        steps=activity_data.get("steps", {}).get("value", 0),
        steps_goal=activity_data.get("steps", {}).get("goal", 8000),
        active_minutes=activity_data.get("activeMinutes", 0),
    )

    return result
