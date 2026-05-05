import pandas as pd
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from training.finetune_patient import _build_dataframe


def _make_readings(n=20):
    from datetime import datetime, timedelta, timezone
    base = datetime(2024, 1, 1, 8, 0, tzinfo=timezone.utc)
    return [
        {"measured_at": (base + timedelta(minutes=5 * i)).isoformat(), "value": 100.0 + i, "rate": 0.0}
        for i in range(n)
    ]


def test_carbs_extracted_from_meal_carbs_field():
    readings = _make_readings()
    meals = [{"taken_at": "2024-01-01T08:30:00+00:00", "meal": {"carbs": 45.0}}]
    df = _build_dataframe(readings, [], meals)
    assert df["carbs_last_60min"].max() > 0.0, "Les glucides doivent être > 0 quand meal.carbs est défini"


def test_carbs_zero_when_meal_carbs_absent():
    readings = _make_readings()
    meals = [{"taken_at": "2024-01-01T08:30:00+00:00", "meal": {}}]
    df = _build_dataframe(readings, [], meals)
    assert df["carbs_last_60min"].max() == 0.0


def test_build_dataframe_empty_meals():
    readings = _make_readings()
    df = _build_dataframe(readings, [], [])
    assert "carbs_last_30min" in df.columns
    assert "carbs_last_60min" in df.columns
    assert df["carbs_last_60min"].sum() == 0.0


def test_build_dataframe_empty_activities():
    readings = _make_readings()
    df = _build_dataframe(readings, [], [])
    assert "activity_calories_60min" in df.columns
    assert df["activity_calories_60min"].sum() == 0.0


def test_build_dataframe_returns_correct_row_count():
    readings = _make_readings(20)
    df = _build_dataframe(readings, [], [])
    assert len(df) == 20


def test_build_dataframe_with_activities():
    readings = _make_readings(20)
    activities = [{"start": "2024-01-01T08:10:00+00:00", "end": "2024-01-01T08:40:00+00:00",
                   "calories_burned": 200.0, "sugar_used": 5.0, "intensity": "high"}]
    df = _build_dataframe(readings, activities, [])
    assert df["activity_calories_60min"].max() > 0.0


def test_wearable_cols_default_to_zero():
    readings = _make_readings()
    df = _build_dataframe(readings, [], [])
    for col in ["has_wearable", "hr_mean", "hr_std", "hrv_rmssd", "temp_mean"]:
        assert (df[col] == 0.0).all(), f"{col} doit être 0 par défaut"
