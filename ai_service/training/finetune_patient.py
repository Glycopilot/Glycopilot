"""
Fine-tuning du modèle LSTM global sur les données d'un patient spécifique.

Le modèle personnel hérite des poids globaux (25 features) et étend la couche
d'entrée à 37 features (+ 5 wearables + 7 activité/repas). Les 12 nouveaux poids
sont initialisés à zéro — le fine-tuning apprend à les utiliser.

Usage :
    python training/finetune_patient.py --patient-id <uuid> --django-url http://localhost:8000
    python training/finetune_patient.py --patient-id <uuid> --data-csv <chemin> --version v1.0
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from models.lstm import LSTMNet, N_FEATURES
from training.utils import TARGET_COLS, compute_metrics, save_report, pinball_loss, combined_loss

# 12 extra features for personal models (5 wearables + 7 activity/meal)
PERSONAL_EXTRA_COLS = [
    # Wearables
    "has_wearable", "hr_mean", "hr_std", "hrv_rmssd", "temp_mean",
    # Activity
    "activity_calories_60min", "activity_sugar_used_60min",
    "activity_intensity", "minutes_since_last_activity",
    # Meals
    "carbs_last_30min", "carbs_last_60min", "minutes_since_last_meal",
]
N_FEATURES_PERSONAL = N_FEATURES + len(PERSONAL_EXTRA_COLS)  # 25 + 12 = 37

SEQ_LEN      = 24
BATCH_SIZE   = 64
MIN_DAYS     = 14    # minimum patient history required
FINETUNE_DAYS = 60   # use last 60 days for fine-tuning


def extend_lstm_weights(global_model: LSTMNet, n_features_new: int) -> LSTMNet:
    """
    Create a personal LSTMNet with extended input (n_features_new).
    Copy all global weights; the extra input columns are zero-initialized.
    """
    personal = LSTMNet(n_features=n_features_new)

    g_sd = global_model.state_dict()
    p_sd = personal.state_dict()

    for key in p_sd:
        if key not in g_sd:
            continue
        g_shape = g_sd[key].shape
        p_shape = p_sd[key].shape

        if g_shape == p_shape:
            p_sd[key] = g_sd[key].clone()
        elif key == "lstm1.weight_ih_l0":
            # Shape: (4*hidden, input_features) — extend input dimension
            extended = torch.zeros(p_shape, dtype=g_sd[key].dtype)
            extended[:, :g_shape[1]] = g_sd[key]
            p_sd[key] = extended
        # All other mismatched keys keep their random init (shouldn't happen)

    personal.load_state_dict(p_sd)
    return personal


def load_patient_data_from_csv(csv_path: str, patient_id: str) -> pd.DataFrame:
    """Load patient data from a pre-exported CSV (columns: datetime, glucose, y_15, y_30, y_60 + extra features)."""
    df = pd.read_csv(csv_path, parse_dates=["datetime"])
    df = df[df["patient_id"].astype(str) == str(patient_id)].copy()
    if df.empty:
        raise ValueError(f"Patient {patient_id} not found in {csv_path}")
    return df.sort_values("datetime").reset_index(drop=True)


def load_patient_data_from_api(patient_id: str, django_url: str, token: str) -> pd.DataFrame:
    """
    Fetch patient glucose history + activities + meals from Django API.
    Builds a dataframe compatible with make_personal_sequences().
    """
    import requests

    headers = {"Authorization": f"Bearer {token}"}
    since = (datetime.now(timezone.utc) - timedelta(days=FINETUNE_DAYS)).isoformat()

    since = (datetime.now(timezone.utc) - timedelta(days=FINETUNE_DAYS)).isoformat()
    readings = []
    url = f"{django_url}/api/glycemia/"
    while url:
        resp = requests.get(url, params={"measured_after": since}, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        readings.extend(data.get("results", data) if isinstance(data, dict) else data)
        url = data.get("next") if isinstance(data, dict) else None

    activity_resp = requests.get(
        f"{django_url}/api/activities/history/",
        headers=headers,
        timeout=30,
    )
    activity_resp.raise_for_status()
    activities = activity_resp.json().get("results", activity_resp.json())

    meal_resp = requests.get(
        f"{django_url}/api/meals/log/",
        headers=headers,
        timeout=30,
    )
    meal_resp.raise_for_status()
    meals = meal_resp.json().get("results", meal_resp.json())

    return _build_dataframe(readings, activities, meals)


def _build_dataframe(readings: list, activities: list, meals: list) -> pd.DataFrame:
    """Combine glucose readings with activity/meal context features per timestep."""
    from training.utils import load_and_engineer

    df_glucose = pd.DataFrame([
        {
            "datetime": r["measured_at"],
            "glucose": r["value"],
            "glucose_roc": r.get("rate", 0.0) or 0.0,
            "participant_id": "patient",
        }
        for r in readings
    ])
    df_glucose["datetime"] = pd.to_datetime(df_glucose["datetime"], utc=True)
    df_glucose = df_glucose.sort_values("datetime").reset_index(drop=True)

    # Build activity lookup: for each reading time, compute activity features in last 60 min
    act_df = pd.DataFrame([
        {
            "end": pd.Timestamp(a["end"], tz="UTC"),
            "start": pd.Timestamp(a["start"], tz="UTC"),
            "calories_burned": a.get("calories_burned") or 0.0,
            "sugar_used": a.get("sugar_used") or 0.0,
            "intensity": {"low": 1.0, "medium": 2.0, "high": 3.0}.get(a.get("intensity", ""), 0.0),
        }
        for a in activities
    ]) if activities else pd.DataFrame(columns=["end", "start", "calories_burned", "sugar_used", "intensity"])

    meal_df = pd.DataFrame([
        {
            "taken_at": pd.Timestamp(m["taken_at"], tz="UTC"),
            "carbs": m.get("meal", {}).get("glucose", 0.0) or 0.0,
        }
        for m in meals
    ]) if meals else pd.DataFrame(columns=["taken_at", "carbs"])

    def act_features_at(t):
        w = t - pd.Timedelta(minutes=60)
        mask = (act_df["end"] >= w) & (act_df["start"] <= t) if not act_df.empty else pd.Series([], dtype=bool)
        sub = act_df[mask] if not act_df.empty else act_df
        last_end = act_df["end"].max() if not act_df.empty else None
        mins_since = min((t - last_end).total_seconds() / 60, 999.0) if last_end and last_end <= t else 999.0
        return {
            "activity_calories_60min": sub["calories_burned"].sum() if not sub.empty else 0.0,
            "activity_sugar_used_60min": sub["sugar_used"].sum() if not sub.empty else 0.0,
            "activity_intensity": sub["intensity"].mean() if not sub.empty else 0.0,
            "minutes_since_last_activity": max(0.0, mins_since),
        }

    def meal_features_at(t):
        if meal_df.empty:
            return {"carbs_last_30min": 0.0, "carbs_last_60min": 0.0, "minutes_since_last_meal": 999.0}
        past = meal_df[meal_df["taken_at"] <= t]
        w30 = t - pd.Timedelta(minutes=30)
        w60 = t - pd.Timedelta(minutes=60)
        last = past["taken_at"].max() if not past.empty else None
        mins = min((t - last).total_seconds() / 60, 999.0) if last else 999.0
        return {
            "carbs_last_30min": past[past["taken_at"] >= w30]["carbs"].sum(),
            "carbs_last_60min": past[past["taken_at"] >= w60]["carbs"].sum(),
            "minutes_since_last_meal": max(0.0, mins),
        }

    extra_rows = [
        {**act_features_at(row["datetime"]), **meal_features_at(row["datetime"])}
        for _, row in df_glucose.iterrows()
    ]
    extra_df = pd.DataFrame(extra_rows, index=df_glucose.index)
    df = pd.concat([df_glucose, extra_df], axis=1)

    # Wearable features — zero by default (not available from API)
    for col in ["has_wearable", "hr_mean", "hr_std", "hrv_rmssd", "temp_mean"]:
        df[col] = 0.0

    # Fill other required columns with defaults for load_and_engineer compatibility
    for col in ["hba1c", "gender_is_female", "glucose_target_30min"]:
        if col not in df.columns:
            df[col] = np.nan

    return df


def make_personal_sequences(df: pd.DataFrame, feature_cols: list[str]) -> tuple[np.ndarray, np.ndarray]:
    """Build sequences for the personal model (seq_len, N_FEATURES_PERSONAL)."""
    from training.utils import TARGET_COLS

    df = df.copy().sort_values("datetime").reset_index(drop=True)
    feats = df[feature_cols].values.astype(np.float32)
    targets = df[TARGET_COLS].values.astype(np.float32)

    X_list, y_list = [], []
    for i in range(SEQ_LEN, len(df)):
        X_list.append(feats[i - SEQ_LEN: i])
        y_list.append(targets[i])

    if not X_list:
        raise ValueError(f"Not enough data to build sequences (need >{SEQ_LEN} rows, got {len(df)})")

    return np.array(X_list), np.array(y_list)



def finetune(
    patient_id: str,
    df: pd.DataFrame,
    global_model_path: str,
    version: str,
    epochs: int = 30,
    device: str = "cpu",
) -> dict:
    dev = torch.device(device)

    from training.utils import FEATURE_COLS
    personal_feature_cols = FEATURE_COLS + PERSONAL_EXTRA_COLS

    # Fill missing personal features with defaults
    for col in personal_feature_cols:
        if col not in df.columns:
            df[col] = 999.0 if "minutes_since" in col else 0.0

    # Require minimum history
    days_available = (df["datetime"].max() - df["datetime"].min()).days
    if days_available < MIN_DAYS:
        raise ValueError(
            f"Patient {patient_id} has only {days_available} days of data "
            f"(minimum {MIN_DAYS} required for fine-tuning)"
        )

    X, y = make_personal_sequences(df, personal_feature_cols)

    # Chronological 80/20 split
    cut = int(len(X) * 0.8)
    X_train, X_val = X[:cut], X[cut:]
    y_train, y_val = y[:cut], y[cut:]

    print(f"[INFO] Patient {patient_id} — {len(X_train)} train / {len(X_val)} val sequences")
    print(f"[INFO] Personal features: {len(personal_feature_cols)} ({N_FEATURES} global + {len(PERSONAL_EXTRA_COLS)} extra = 5 wearables + 7 activity/meal)")

    # Load and extend global model
    global_model = LSTMNet(n_features=N_FEATURES)
    global_model.load_state_dict(torch.load(global_model_path, map_location="cpu", weights_only=True))
    model = extend_lstm_weights(global_model, N_FEATURES_PERSONAL).to(dev)

    optimizer = torch.optim.AdamW(model.parameters(), lr=5e-4, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3, factor=0.5)

    train_loader = DataLoader(
        TensorDataset(torch.tensor(X_train), torch.tensor(y_train)),
        batch_size=BATCH_SIZE, shuffle=True,
    )
    val_loader = DataLoader(
        TensorDataset(torch.tensor(X_val), torch.tensor(y_val)),
        batch_size=BATCH_SIZE,
    )

    best_val_loss = float("inf")
    patience_counter = 0
    PATIENCE = 7
    history = {"train_loss": [], "val_loss": [], "best_epoch": 1}

    out_dir = f"artifacts/patients/{patient_id}"
    os.makedirs(out_dir, exist_ok=True)

    print(f"[INFO] Fine-tuning ({epochs} epochs max, patience={PATIENCE})...")
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        for xb, yb in train_loader:
            xb, yb = xb.to(dev), yb.to(dev)
            optimizer.zero_grad()
            o15, o30, o60 = model(xb)
            loss = combined_loss(o15, o30, o60, yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item()

        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for xb, yb in val_loader:
                xb, yb = xb.to(dev), yb.to(dev)
                o15, o30, o60 = model(xb)
                val_loss += combined_loss(o15, o30, o60, yb).item()

        train_loss /= len(train_loader)
        val_loss /= len(val_loader)
        scheduler.step(val_loss)
        history["train_loss"].append(round(train_loss, 6))
        history["val_loss"].append(round(val_loss, 6))

        improved = val_loss < best_val_loss
        marker = "✓" if improved else f"({patience_counter + 1}/{PATIENCE})"
        print(f"  Epoch {epoch:3d}/{epochs} — train: {train_loss:.4f} | val: {val_loss:.4f} {marker}", flush=True)

        if improved:
            best_val_loss = val_loss
            patience_counter = 0
            history["best_epoch"] = epoch
            torch.save(model.state_dict(), f"{out_dir}/lstm_personal_{version}.pt")
        else:
            patience_counter += 1
            if patience_counter >= PATIENCE:
                print(f"  Early stopping à l'epoch {epoch}.", flush=True)
                break

    with open(f"{out_dir}/history_{version}.json", "w") as f:
        json.dump(history, f, indent=2)

    # Evaluate on val set
    model.load_state_dict(torch.load(f"{out_dir}/lstm_personal_{version}.pt", map_location=dev, weights_only=True))
    model.eval()
    X_val_t = torch.tensor(X_val).to(dev)
    with torch.no_grad():
        o15, o30, o60 = model(X_val_t)

    metrics = {}
    for h, out, idx in [(15, o15, 0), (30, o30, 1), (60, o60, 2)]:
        preds = out[:, 0].cpu().numpy()
        metrics[f"mae_{h}"] = compute_metrics(y_val[:, idx], preds)["mae"]
        print(f"  Val MAE @{h}min : {metrics[f'mae_{h}']:.2f} mg/dL")

    # Save metadata
    meta = {
        "patient_id": patient_id,
        "version": version,
        "finetuned_at": datetime.now(timezone.utc).isoformat(),
        "n_train": len(X_train),
        "n_val": len(X_val),
        "days_of_data": days_available,
        "n_features": N_FEATURES_PERSONAL,
        "extra_features": PERSONAL_EXTRA_COLS,
        "best_val_loss": round(best_val_loss, 4),
        "val_metrics": metrics,
        "global_model_path": global_model_path,
    }
    with open(f"{out_dir}/meta_{version}.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n[OK] Modèle personnel sauvegardé : {out_dir}/lstm_personal_{version}.pt")
    return metrics


def main():
    parser = argparse.ArgumentParser(description="Fine-tune le modèle LSTM pour un patient spécifique")
    parser.add_argument("--patient-id", required=True, help="UUID du patient")
    parser.add_argument("--global-model", default="artifacts/lstm/lstm_v1.0.pt", help="Chemin du modèle global")
    parser.add_argument("--data-csv", default=None, help="CSV patient exporté (si pas d'API Django)")
    parser.add_argument("--django-url", default="http://localhost:8000", help="URL de l'API Django")
    parser.add_argument("--token", default="", help="Bearer token Django")
    parser.add_argument("--version", default="v1.0")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    args = parser.parse_args()

    if args.data_csv:
        print(f"[INFO] Chargement depuis CSV : {args.data_csv}")
        df = load_patient_data_from_csv(args.data_csv, args.patient_id)
    else:
        print(f"[INFO] Chargement depuis API Django : {args.django_url}")
        df = load_patient_data_from_api(args.patient_id, args.django_url, args.token)

    finetune(
        patient_id=args.patient_id,
        df=df,
        global_model_path=args.global_model,
        version=args.version,
        epochs=args.epochs,
        device=args.device,
    )


if __name__ == "__main__":
    main()
