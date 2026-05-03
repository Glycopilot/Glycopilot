"""Shared utilities for all training scripts."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone

import numpy as np
import pandas as pd


DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../backend/data/datasets/glycemia",
    "BIG-IDEAs-Lab-Glycemic-Variability-and-Wearable-Device-Data.csv",
)

FEATURE_COLS = [
    "glucose", "lag_5", "lag_15", "lag_30", "lag_60", "lag_90", "lag_120",
    "rate", "delta", "acceleration",
    "roll_mean_15", "roll_std_15",
    "roll_mean_30", "roll_std_30",
    "roll_mean_60", "roll_std_60",
    "is_hypo_risk", "is_hyper_risk",
    "h_sin", "h_cos", "d_sin", "d_cos",
    "hba1c", "gender",
    "context",
]  # 25 features — wearables excluded from global model

TARGET_COLS = ["y_15", "y_30", "y_60"]

CONTEXT_MAP = {
    "fasting": 0, "preprandial": 1, "postprandial_1h": 2,
    "postprandial_2h": 3, "bedtime": 4, "exercise": 5,
    "stress": 6, "correction": 7,
}

import math


def load_and_engineer(path: str) -> pd.DataFrame:
    """Load CSV and compute all features + targets."""
    df = pd.read_csv(path, parse_dates=["datetime"])
    df = df.sort_values(["participant_id", "datetime"]).reset_index(drop=True)

    g = df.groupby("participant_id")

    # Lags
    df["lag_5"]   = g["glucose"].shift(1)
    df["lag_15"]  = g["glucose"].shift(3)
    df["lag_30"]  = g["glucose"].shift(6)
    df["lag_60"]  = g["glucose"].shift(12)
    df["lag_90"]  = g["glucose"].shift(18)
    df["lag_120"] = g["glucose"].shift(24)

    # Rolling
    df["roll_mean_15"] = g["glucose"].transform(lambda x: x.rolling(3, min_periods=1).mean())
    df["roll_std_15"]  = g["glucose"].transform(lambda x: x.rolling(3, min_periods=1).std().fillna(0))
    df["roll_mean_30"] = g["glucose"].transform(lambda x: x.rolling(6, min_periods=1).mean())
    df["roll_std_30"]  = g["glucose"].transform(lambda x: x.rolling(6, min_periods=1).std().fillna(0))
    df["roll_mean_60"] = g["glucose"].transform(lambda x: x.rolling(12, min_periods=1).mean())
    df["roll_std_60"]  = g["glucose"].transform(lambda x: x.rolling(12, min_periods=1).std().fillna(0))

    # Derived
    df["rate"]         = df.get("glucose_roc", pd.Series(0.0, index=df.index)).fillna(0)
    df["delta"]        = df["glucose"] - df["lag_5"].fillna(df["glucose"])
    df["acceleration"] = g["rate"].diff().fillna(0)
    df["is_hypo_risk"]  = (df["glucose"] < 80).astype(float)
    df["is_hyper_risk"] = (df["glucose"] > 160).astype(float)

    # Time encoding
    df["h_sin"] = df["datetime"].dt.hour.apply(lambda h: math.sin(2 * math.pi * h / 24))
    df["h_cos"] = df["datetime"].dt.hour.apply(lambda h: math.cos(2 * math.pi * h / 24))
    df["d_sin"] = df["datetime"].dt.dayofweek.apply(lambda d: math.sin(2 * math.pi * d / 7))
    df["d_cos"] = df["datetime"].dt.dayofweek.apply(lambda d: math.cos(2 * math.pi * d / 7))

    # Wearable (already in dataset)
    df["has_wearable"] = df["hr_mean_5min"].notna().astype(float)
    df["hr_mean"]   = df.get("hr_mean_5min", pd.Series(0.0, index=df.index)).fillna(0)
    df["hr_std"]    = df.get("hr_std_5min", pd.Series(0.0, index=df.index)).fillna(0)
    df["hrv_rmssd"] = df.get("hrv_rmssd_5min", pd.Series(0.0, index=df.index)).fillna(0)
    df["temp_mean"] = df.get("temp_mean_5min", pd.Series(0.0, index=df.index)).fillna(0)

    # Patient meta
    df["hba1c"]  = df["hba1c"].fillna(0)
    df["gender"] = df["gender_is_female"].fillna(0)
    df["context"] = 0  # not in dataset — default to 0

    # Targets
    df["y_30"] = df.get("glucose_target_30min", g["glucose"].shift(-6))
    df["y_15"] = g["glucose"].shift(-3)
    df["y_60"] = g["glucose"].shift(-12)

    # Fill lag NaNs with current value
    for col in ["lag_5", "lag_15", "lag_30", "lag_60", "lag_90", "lag_120"]:
        df[col] = df[col].fillna(df["glucose"])

    # Drop rows with missing targets
    df = df.dropna(subset=TARGET_COLS)

    return df


def loso_split(df: pd.DataFrame, test_participant) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Leave-One-Subject-Out split. Returns train, val, test."""
    # Cast to match the dtype of participant_id in the dataframe
    if pd.api.types.is_integer_dtype(df["participant_id"].dtype):
        test_participant = int(test_participant)
    test = df[df["participant_id"] == test_participant].copy()
    rest = df[df["participant_id"] != test_participant].copy()

    # Chronological 80/20 split per participant
    train_parts, val_parts = [], []
    for pid, group in rest.groupby("participant_id"):
        group = group.sort_values("datetime")
        cut = int(len(group) * 0.8)
        train_parts.append(group.iloc[:cut])
        val_parts.append(group.iloc[cut:])

    train = pd.concat(train_parts).reset_index(drop=True)
    val   = pd.concat(val_parts).reset_index(drop=True)

    return train, val, test


def make_sequences(df: pd.DataFrame, seq_len: int = 24) -> tuple[np.ndarray, np.ndarray]:
    """Build (N, seq_len, features) and (N, 3) arrays for LSTM/Transformer."""
    X_list, y_list = [], []
    for _, group in df.groupby("participant_id"):
        group = group.sort_values("datetime")
        feats = group[FEATURE_COLS].values.astype(np.float32)
        targets = group[TARGET_COLS].values.astype(np.float32)
        for i in range(seq_len, len(group)):
            X_list.append(feats[i - seq_len: i])
            y_list.append(targets[i])
    return np.array(X_list), np.array(y_list)


def save_report(report: dict, version: str) -> None:
    os.makedirs("artifacts/metadata", exist_ok=True)
    path = f"artifacts/metadata/training_report_{version}.json"
    report["saved_at"] = datetime.now(timezone.utc).isoformat()
    with open(path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"[OK] Rapport sauvegardé : {path}")


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae  = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    mard = float(np.mean(np.abs(y_true - y_pred) / (np.abs(y_true) + 1e-6)) * 100)
    return {"mae": round(mae, 3), "rmse": round(rmse, 3), "mard": round(mard, 3)}
