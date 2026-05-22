import pandas as pd
import pytest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from training.finetune_patient import (
    PERSONAL_EXTRA_COLS,
    _build_dataframe,
    load_patient_data_from_api,
    load_patient_data_from_csv,
    make_personal_sequences,
)
from training.utils import FEATURE_COLS, TARGET_COLS


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


def test_load_patient_data_from_csv_filters_patient_and_sorts(tmp_path):
    csv_path = tmp_path / "patients.csv"
    pd.DataFrame(
        [
            {"patient_id": "p1", "datetime": "2024-01-01T08:10:00Z", "glucose": 102},
            {"patient_id": "p2", "datetime": "2024-01-01T08:00:00Z", "glucose": 120},
            {"patient_id": "p1", "datetime": "2024-01-01T08:00:00Z", "glucose": 100},
        ]
    ).to_csv(csv_path, index=False)

    df = load_patient_data_from_csv(str(csv_path), "p1")

    assert df["patient_id"].tolist() == ["p1", "p1"]
    assert df["glucose"].tolist() == [100, 102]


def test_load_patient_data_from_csv_raises_when_patient_missing(tmp_path):
    csv_path = tmp_path / "patients.csv"
    pd.DataFrame([{"patient_id": "p1", "datetime": "2024-01-01T08:00:00Z"}]).to_csv(csv_path, index=False)

    with pytest.raises(ValueError, match="not found"):
        load_patient_data_from_csv(str(csv_path), "unknown")


def test_load_patient_data_from_api_fetches_paginated_resources(monkeypatch):
    class Response:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    readings_page_1 = {"results": _make_readings(2), "next": "http://django/api/glycemia/?page=2"}
    readings_page_2 = {"results": _make_readings(2), "next": None}
    activities = {"results": [], "next": None}
    meals = {"results": [], "next": None}
    responses = [Response(readings_page_1), Response(readings_page_2), Response(activities), Response(meals)]

    class Requests:
        calls = []

        @staticmethod
        def get(url, **kwargs):
            Requests.calls.append((url, kwargs))
            return responses.pop(0)

    monkeypatch.setitem(sys.modules, "requests", Requests)

    df = load_patient_data_from_api("p1", "http://django", "token")

    assert len(df) == 4
    assert Requests.calls[0][1]["headers"] == {"Authorization": "ServiceToken token"}
    assert Requests.calls[0][1]["params"]["user_id"] == "p1"
    assert Requests.calls[1][0] == "http://django/api/glycemia/?page=2"


def _personal_sequence_dataframe(rows=28):
    data = []
    for i in range(rows):
        row = {
            "datetime": pd.Timestamp("2024-01-01") + pd.Timedelta(minutes=5 * i),
            "participant_id": "patient",
        }
        for col in FEATURE_COLS + PERSONAL_EXTRA_COLS:
            row[col] = float(i + 1)
        for target in TARGET_COLS:
            row[target] = 100.0 + i
        data.append(row)
    return pd.DataFrame(data)


def test_make_personal_sequences_builds_arrays():
    feature_cols = FEATURE_COLS + PERSONAL_EXTRA_COLS

    X, y = make_personal_sequences(_personal_sequence_dataframe(), feature_cols)

    assert X.shape == (4, 24, len(feature_cols))
    assert y.shape == (4, 3)


def test_make_personal_sequences_raises_when_history_too_short():
    feature_cols = FEATURE_COLS + PERSONAL_EXTRA_COLS

    with pytest.raises(ValueError, match="Not enough data"):
        make_personal_sequences(_personal_sequence_dataframe(rows=12), feature_cols)
