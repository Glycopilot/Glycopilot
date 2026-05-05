from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from api.schemas import PredictRequest, ReadingInput, ActivityInput, MealInput


def _base_readings(n=6):
    return [
        {"measured_at": f"2024-01-15T0{i}:00:00Z", "value": 100.0 + i}
        for i in range(n)
    ]


def test_valid_request():
    req = PredictRequest(
        user_id="abc",
        for_time="2024-01-15T10:00:00Z",
        readings=_base_readings(6),
    )
    assert req.user_id == "abc"
    assert len(req.readings) == 6


def test_too_few_readings_raises():
    with pytest.raises(ValidationError):
        PredictRequest(
            user_id="abc",
            for_time="2024-01-15T10:00:00Z",
            readings=_base_readings(3),
        )


def test_reading_value_too_low_raises():
    readings = _base_readings(6)
    readings[0]["value"] = 10.0
    with pytest.raises(ValidationError):
        PredictRequest(user_id="abc", for_time="2024-01-15T10:00:00Z", readings=readings)


def test_reading_value_too_high_raises():
    readings = _base_readings(6)
    readings[0]["value"] = 700.0
    with pytest.raises(ValidationError):
        PredictRequest(user_id="abc", for_time="2024-01-15T10:00:00Z", readings=readings)


def test_optional_fields_default_none():
    req = PredictRequest(
        user_id="abc",
        for_time="2024-01-15T10:00:00Z",
        readings=_base_readings(6),
    )
    assert req.wearable is None
    assert req.patient_meta is None
    assert req.activities is None
    assert req.meals is None


def test_invalid_activity_intensity_raises():
    with pytest.raises(ValidationError):
        ActivityInput(
            start="2024-01-15T09:00:00Z",
            end="2024-01-15T09:30:00Z",
            intensity="extreme",
        )


def test_valid_activity_intensity():
    for level in ("low", "medium", "high"):
        act = ActivityInput(
            start="2024-01-15T09:00:00Z",
            end="2024-01-15T09:30:00Z",
            intensity=level,
        )
        assert act.intensity == level


def test_readings_sorted_by_validator():
    readings = list(reversed(_base_readings(6)))
    req = PredictRequest(
        user_id="abc",
        for_time="2024-01-15T10:00:00Z",
        readings=readings,
    )
    times = [r.measured_at for r in req.readings]
    assert times == sorted(times)
