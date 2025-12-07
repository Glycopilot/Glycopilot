"""
Service de calcul du Health Score.
Score 0-100 avec pondération :
- Glycémie : 40%
- Observance médicaments : 20%
- Nutrition : 20%
- Activité : 20%
"""

from django.utils import timezone
from datetime import timedelta


def calculate_glucose_score(glucose_value: float | None, unit: str = "mg/dL") -> float:
    """
    Calcule le score glycémie (0-100).
    Plage idéale : 70-180 mg/dL
    """
    if glucose_value is None:
        return 50.0  # Score neutre si pas de données

    # Convertir en mg/dL si nécessaire
    if unit == "mmol/L":
        glucose_value = glucose_value * 18.0

    # Plage idéale : 70-180 mg/dL = 100 points
    if 70 <= glucose_value <= 180:
        return 100.0
    # Légèrement hors plage : 60-70 ou 180-200 = 70-90 points
    elif 60 <= glucose_value < 70:
        return 70.0 + ((glucose_value - 60) / 10) * 20
    elif 180 < glucose_value <= 200:
        return 90.0 - ((glucose_value - 180) / 20) * 20
    # Hors plage modéré : 50-60 ou 200-250 = 40-70 points
    elif 50 <= glucose_value < 60:
        return 40.0 + ((glucose_value - 50) / 10) * 30
    elif 200 < glucose_value <= 250:
        return 70.0 - ((glucose_value - 200) / 50) * 30
    # Critique : <50 ou >250 = 0-40 points
    elif glucose_value < 50:
        return max(0, glucose_value / 50 * 40)
    else:  # > 250
        return max(0, 40 - ((glucose_value - 250) / 100) * 40)


def calculate_medication_score(taken_count: int, expected_count: int) -> float:
    """
    Calcule le score d'observance médicaments (0-100).
    Basé sur le ratio prises effectuées / prises attendues.
    """
    if expected_count == 0:
        return 100.0  # Pas de médicaments = score parfait

    ratio = taken_count / expected_count
    return min(100.0, ratio * 100)


def calculate_nutrition_score(
    calories_consumed: int,
    calories_goal: int,
    carbs_consumed: int = 0,
    carbs_goal: int = 200
) -> float:
    """
    Calcule le score nutrition (0-100).
    Basé sur l'atteinte des objectifs caloriques et glucides.
    """
    if calories_goal == 0:
        return 50.0

    # Score calories (60% du score nutrition)
    calorie_ratio = calories_consumed / calories_goal
    if 0.8 <= calorie_ratio <= 1.1:
        calorie_score = 100.0
    elif calorie_ratio < 0.8:
        calorie_score = (calorie_ratio / 0.8) * 100
    else:  # > 1.1
        calorie_score = max(0, 100 - ((calorie_ratio - 1.1) / 0.4) * 100)

    # Score glucides (40% du score nutrition)
    if carbs_goal == 0:
        carbs_score = 100.0
    else:
        carbs_ratio = carbs_consumed / carbs_goal
        if 0.7 <= carbs_ratio <= 1.0:
            carbs_score = 100.0
        elif carbs_ratio < 0.7:
            carbs_score = (carbs_ratio / 0.7) * 100
        else:  # > 1.0
            carbs_score = max(0, 100 - ((carbs_ratio - 1.0) / 0.5) * 100)

    return (calorie_score * 0.6) + (carbs_score * 0.4)


def calculate_activity_score(steps: int, steps_goal: int, active_minutes: int = 0) -> float:
    """
    Calcule le score activité (0-100).
    Basé sur les pas et minutes actives.
    """
    if steps_goal == 0:
        steps_goal = 8000  # Objectif par défaut

    # Score pas (70% du score activité)
    steps_ratio = steps / steps_goal
    steps_score = min(100.0, steps_ratio * 100)

    # Score minutes actives (30% du score activité)
    # Objectif : 30 minutes par jour
    active_goal = 30
    active_ratio = active_minutes / active_goal
    active_score = min(100.0, active_ratio * 100)

    return (steps_score * 0.7) + (active_score * 0.3)


def calculate_health_score(
    glucose_value: float | None = None,
    glucose_unit: str = "mg/dL",
    medication_taken: int = 0,
    medication_expected: int = 0,
    calories_consumed: int = 0,
    calories_goal: int = 1800,
    carbs_consumed: int = 0,
    carbs_goal: int = 200,
    steps: int = 0,
    steps_goal: int = 8000,
    active_minutes: int = 0
) -> int:
    """
    Calcule le Health Score global (0-100).
    Pondération :
    - Glycémie : 40%
    - Observance médicaments : 20%
    - Nutrition : 20%
    - Activité : 20%
    """
    glucose_score = calculate_glucose_score(glucose_value, glucose_unit)
    medication_score = calculate_medication_score(medication_taken, medication_expected)
    nutrition_score = calculate_nutrition_score(
        calories_consumed, calories_goal, carbs_consumed, carbs_goal
    )
    activity_score = calculate_activity_score(steps, steps_goal, active_minutes)

    total_score = (
        (glucose_score * 0.40) +
        (medication_score * 0.20) +
        (nutrition_score * 0.20) +
        (activity_score * 0.20)
    )

    return round(total_score)
