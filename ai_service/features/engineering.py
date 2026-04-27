"""
Build the feature matrix from a PredictRequest.

Returns:
    features : np.ndarray of shape (seq_len, N_FEATURES)
    missing_ratio : float  fraction of expected readings that were missing
"""
from __future__ import annotations

import math
import numpy as np
import pandas as pd

from core.config import settings

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


def build_features(request) -> tuple[np.ndarray, float]:
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
    df["lag_5"] = df["value"].shift(1).fillna(df["value"].iloc[0])
    df["lag_15"] = df["value"].shift(3).fillna(df["value"].iloc[0])
    df["lag_30"] = df["value"].shift(6).fillna(df["value"].iloc[0])
    df["lag_60"] = df["value"].shift(12).fillna(df["value"].iloc[0])

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
    df["is_hypo_risk"] = (df["value"] < 80).astype(float)
    df["is_hyper_risk"] = (df["value"] > 160).astype(float)

    # Time encoding
    time_enc = df["measured_at"].apply(
        lambda t: pd.Series(_time_encoding(t), index=["h_sin", "h_cos", "d_sin", "d_cos"])
    )
    df = pd.concat([df, time_enc], axis=1)

    # Wearable (optional)
    has_wearable = wearable is not None and any(
        v is not None for v in [wearable.hr_mean, wearable.hrv_rmssd, wearable.temp_mean]
    )
    df["has_wearable"] = float(has_wearable)
    df["hr_mean"] = float(wearable.hr_mean or 0.0) if wearable else 0.0
    df["hr_std"] = float(wearable.hr_std or 0.0) if wearable else 0.0
    df["hrv_rmssd"] = float(wearable.hrv_rmssd or 0.0) if wearable else 0.0
    df["temp_mean"] = float(wearable.temp_mean or 0.0) if wearable else 0.0

    # Patient meta (broadcast to all rows)
    df["hba1c"] = float(patient_meta.hba1c or 0.0) if patient_meta else 0.0
    df["gender"] = float(patient_meta.gender_is_female or 0.0) if patient_meta else 0.0

    feature_cols = [
        "value", "lag_5", "lag_15", "lag_30", "lag_60",
        "rate", "delta", "acceleration",
        "roll_mean_15", "roll_std_15",
        "roll_mean_30", "roll_std_30",
        "roll_mean_60", "roll_std_60",
        "is_hypo_risk", "is_hyper_risk",
        "h_sin", "h_cos", "d_sin", "d_cos",
        "has_wearable", "hr_mean", "hr_std", "hrv_rmssd", "temp_mean",
        "hba1c", "gender",
        "context",
    ]

    seq_len = settings.sequence_length
    feature_matrix = df[feature_cols].values.astype(np.float32)

    # Pad or truncate to seq_len
    if len(feature_matrix) >= seq_len:
        feature_matrix = feature_matrix[-seq_len:]
        missing_ratio = 0.0
    else:
        pad_len = seq_len - len(feature_matrix)
        padding = np.zeros((pad_len, feature_matrix.shape[1]), dtype=np.float32)
        feature_matrix = np.vstack([padding, feature_matrix])
        missing_ratio = round(pad_len / seq_len, 4)

    return feature_matrix, missing_ratio
