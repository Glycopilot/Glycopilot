"""
Build the feature matrix from a PredictRequest.

Returns:
    features : np.ndarray of shape (seq_len, N_FEATURES)          — global model (30 features)
    ext_features : np.ndarray of shape (seq_len, N_FEATURES + 7)  — personal model (37 features)
    missing_ratio : float
"""
from __future__ import annotations

import math
import numpy as np
import pandas as pd

from core.config import settings

INTENSITY_MAP = {"low": 1.0, "medium": 2.0, "high": 3.0}

# 7 extra features added for personal fine-tuned models
PERSONAL_EXTRA_COLS = [
    "activity_calories_60min",
    "activity_sugar_used_60min",
    "activity_intensity",
    "minutes_since_last_activity",
    "carbs_last_30min",
    "carbs_last_60min",
    "minutes_since_last_meal",
]


def _compute_activity_features(activities, for_time: pd.Timestamp) -> dict:
    if not activities:
        return {
            "activity_calories_60min": 0.0,
            "activity_sugar_used_60min": 0.0,
            "activity_intensity": 0.0,
            "minutes_since_last_activity": 999.0,
        }
    window = for_time - pd.Timedelta(minutes=60)
    calories, sugar, intensities = 0.0, 0.0, []
    last_end = None
    for act in activities:
        end = pd.Timestamp(act.end, tz="UTC") if pd.Timestamp(act.end).tzinfo is None else pd.Timestamp(act.end)
        start = pd.Timestamp(act.start, tz="UTC") if pd.Timestamp(act.start).tzinfo is None else pd.Timestamp(act.start)
        if end >= window and start <= for_time:
            calories += act.calories_burned or 0.0
            sugar += act.sugar_used or 0.0
            if act.intensity:
                intensities.append(INTENSITY_MAP.get(act.intensity, 0.0))
        if last_end is None or end > last_end:
            last_end = end
    minutes_since = min((for_time - last_end).total_seconds() / 60, 999.0) if last_end else 999.0
    return {
        "activity_calories_60min": calories,
        "activity_sugar_used_60min": sugar,
        "activity_intensity": float(np.mean(intensities)) if intensities else 0.0,
        "minutes_since_last_activity": max(0.0, minutes_since),
    }


def _compute_meal_features(meals, for_time: pd.Timestamp) -> dict:
    if not meals:
        return {"carbs_last_30min": 0.0, "carbs_last_60min": 0.0, "minutes_since_last_meal": 999.0}
    w30 = for_time - pd.Timedelta(minutes=30)
    w60 = for_time - pd.Timedelta(minutes=60)
    carbs30, carbs60 = 0.0, 0.0
    last_meal = None
    for meal in meals:
        t = pd.Timestamp(meal.taken_at, tz="UTC") if pd.Timestamp(meal.taken_at).tzinfo is None else pd.Timestamp(meal.taken_at)
        if t <= for_time:
            if t >= w30:
                carbs30 += meal.carbs or 0.0
            if t >= w60:
                carbs60 += meal.carbs or 0.0
            if last_meal is None or t > last_meal:
                last_meal = t
    minutes_since = min((for_time - last_meal).total_seconds() / 60, 999.0) if last_meal else 999.0
    return {
        "carbs_last_30min": carbs30,
        "carbs_last_60min": carbs60,
        "minutes_since_last_meal": max(0.0, minutes_since),
    }

CONTEXT_MAP = {
    "fasting": 0,
    "preprandial": 1,
    "postprandial_1h": 2,
    "postprandial_2h": 3,
    "bedtime": 4,
    "exercise": 5,
    "stress": 6,
    "correction": 7,
}


def _time_encoding(dt: pd.Timestamp) -> tuple[float, float, float, float]:
    hour_sin = math.sin(2 * math.pi * dt.hour / 24)
    hour_cos = math.cos(2 * math.pi * dt.hour / 24)
    dow_sin = math.sin(2 * math.pi * dt.dayofweek / 7)
    dow_cos = math.cos(2 * math.pi * dt.dayofweek / 7)
    return hour_sin, hour_cos, dow_sin, dow_cos


def build_features(request) -> tuple[np.ndarray, np.ndarray, float]:
    readings = request.readings
    wearable = request.wearable
    patient_meta = request.patient_meta

    df = pd.DataFrame(
        [
            {
                "measured_at": r.measured_at,
                "value": r.value,
                "trend": r.trend,
                "rate": r.rate if r.rate is not None else 0.0,
                "context": CONTEXT_MAP.get(r.context or "", 0),
            }
            for r in readings
        ]
    )
    df = df.sort_values("measured_at").reset_index(drop=True)
    df["measured_at"] = pd.to_datetime(df["measured_at"], utc=True)

    # Lags
    df["lag_5"]   = df["value"].shift(1).fillna(df["value"].iloc[0])
    df["lag_15"]  = df["value"].shift(3).fillna(df["value"].iloc[0])
    df["lag_30"]  = df["value"].shift(6).fillna(df["value"].iloc[0])
    df["lag_60"]  = df["value"].shift(12).fillna(df["value"].iloc[0])
    df["lag_90"]  = df["value"].shift(18).fillna(df["value"].iloc[0])
    df["lag_120"] = df["value"].shift(24).fillna(df["value"].iloc[0])

    # Rolling stats
    df["roll_mean_15"] = df["value"].rolling(3, min_periods=1).mean()
    df["roll_std_15"] = df["value"].rolling(3, min_periods=1).std().fillna(0)
    df["roll_mean_30"] = df["value"].rolling(6, min_periods=1).mean()
    df["roll_std_30"] = df["value"].rolling(6, min_periods=1).std().fillna(0)
    df["roll_mean_60"] = df["value"].rolling(12, min_periods=1).mean()
    df["roll_std_60"] = df["value"].rolling(12, min_periods=1).std().fillna(0)

    # Derived
    df["delta"] = df["value"] - df["lag_5"]
    df["acceleration"] = df["rate"] - df["rate"].shift(1).fillna(df["rate"].iloc[0])
    df["is_hypo_risk"]  = (df["value"] < 80).astype(float)
    df["is_hyper_risk"] = (df["value"] > 160).astype(float)

    # Time encoding
    time_enc = df["measured_at"].apply(
        lambda t: pd.Series(_time_encoding(t), index=["h_sin", "h_cos", "d_sin", "d_cos"])
    )
    df = pd.concat([df, time_enc], axis=1)

    # Patient meta (broadcast to all rows)
    df["hba1c"] = float(patient_meta.hba1c or 0.0) if patient_meta else 0.0
    df["gender"] = float(patient_meta.gender_is_female or 0.0) if patient_meta else 0.0

    global_cols = [
        "value", "lag_5", "lag_15", "lag_30", "lag_60", "lag_90", "lag_120",
        "rate", "delta", "acceleration",
        "roll_mean_15", "roll_std_15",
        "roll_mean_30", "roll_std_30",
        "roll_mean_60", "roll_std_60",
        "is_hypo_risk", "is_hyper_risk",
        "h_sin", "h_cos", "d_sin", "d_cos",
        "hba1c", "gender", "context",
    ]

    # Personal extra features (activity + meals) — used only by fine-tuned models
    for_time = pd.Timestamp(request.for_time, tz="UTC") if pd.Timestamp(request.for_time).tzinfo is None else pd.Timestamp(request.for_time)
    act_feats = _compute_activity_features(request.activities or [], for_time)
    meal_feats = _compute_meal_features(request.meals or [], for_time)
    for col, val in {**act_feats, **meal_feats}.items():
        df[col] = val

    seq_len = settings.sequence_length

    def _build_matrix(cols: list[str]) -> np.ndarray:
        mat = df[cols].values.astype(np.float32)
        if len(mat) >= seq_len:
            return mat[-seq_len:]
        pad = np.zeros((seq_len - len(mat), mat.shape[1]), dtype=np.float32)
        return np.vstack([pad, mat])

    global_matrix = _build_matrix(global_cols)
    personal_matrix = _build_matrix(global_cols + PERSONAL_EXTRA_COLS)

    missing_ratio = round(max(0, seq_len - len(df)) / seq_len, 4)

    return global_matrix, personal_matrix, missing_ratio
