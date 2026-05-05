import numpy as np
import pytest

from api.schemas import PredictRequest, WearableInput, ActivityInput, MealInput
from features.engineering import build_features, PERSONAL_EXTRA_COLS
from core.config import settings

N_GLOBAL = 25
N_PERSONAL = 37


def _make_request(n_readings=24, with_wearable=False, with_activities=False, with_meals=False):
    from datetime import datetime, timedelta, timezone
    base = datetime(2024, 1, 15, 8, 0, tzinfo=timezone.utc)
    readings = [
        {"measured_at": (base + timedelta(minutes=5 * i)).isoformat(), "value": 100.0 + i * 0.5}
        for i in range(n_readings)
    ]
    payload = {
        "user_id": "test-user",
        "for_time": (base + timedelta(minutes=5 * n_readings)).isoformat(),
        "readings": readings,
    }
    if with_wearable:
        payload["wearable"] = {"hr_mean": 72.0, "hr_std": 5.0, "hrv_rmssd": 35.0, "temp_mean": 36.5}
    if with_activities:
        payload["activities"] = [
            {
                "start": (base + timedelta(minutes=30)).isoformat(),
                "end": (base + timedelta(minutes=60)).isoformat(),
                "calories_burned": 150.0,
                "intensity": "medium",
            }
        ]
    if with_meals:
        payload["meals"] = [
            {
                "taken_at": (base + timedelta(minutes=45)).isoformat(),
                "carbs": 40.0,
            }
        ]
    return PredictRequest(**payload)


def test_build_features_returns_three_values():
    req = _make_request()
    result = build_features(req)
    assert len(result) == 3


def test_global_matrix_shape():
    req = _make_request(n_readings=24)
    global_mat, _, _ = build_features(req)
    assert global_mat.shape == (settings.sequence_length, N_GLOBAL)


def test_personal_matrix_shape():
    req = _make_request(n_readings=24)
    _, personal_mat, _ = build_features(req)
    assert personal_mat.shape == (settings.sequence_length, N_PERSONAL)


def test_missing_ratio_zero_when_enough_readings():
    req = _make_request(n_readings=settings.sequence_length)
    _, _, missing_ratio = build_features(req)
    assert missing_ratio == 0.0


def test_missing_ratio_nonzero_when_few_readings():
    req = _make_request(n_readings=6)
    _, _, missing_ratio = build_features(req)
    assert missing_ratio > 0.0


def test_wearable_zeros_when_absent():
    req = _make_request(with_wearable=False)
    _, personal_mat, _ = build_features(req)
    has_wearable_idx = PERSONAL_EXTRA_COLS.index("has_wearable")
    assert personal_mat[0, N_GLOBAL + has_wearable_idx] == 0.0


def test_wearable_populated_when_present():
    req = _make_request(with_wearable=True)
    _, personal_mat, _ = build_features(req)
    has_wearable_idx = PERSONAL_EXTRA_COLS.index("has_wearable")
    assert personal_mat[0, N_GLOBAL + has_wearable_idx] == 1.0


def test_global_matrix_dtype():
    req = _make_request()
    global_mat, _, _ = build_features(req)
    assert global_mat.dtype == np.float32


def test_personal_extra_cols_count():
    assert len(PERSONAL_EXTRA_COLS) == 12
