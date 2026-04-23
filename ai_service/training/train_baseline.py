"""
Entraînement du modèle Baseline (Régression Linéaire).

Usage :
    python training/train_baseline.py
    python training/train_baseline.py --data <chemin_csv> --test-participant 001 --version v1.0
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import joblib
import numpy as np
from sklearn.linear_model import LinearRegression, QuantileRegressor
from sklearn.preprocessing import StandardScaler

from training.utils import (
    DATA_PATH, FEATURE_COLS, TARGET_COLS,
    load_and_engineer, loso_split, save_report, compute_metrics,
)


def main(data_path: str, test_participant: str, version: str) -> None:
    print(f"[INFO] Chargement des données : {data_path}")
    df = load_and_engineer(data_path)

    participants = df["participant_id"].unique().tolist()
    print(f"[INFO] Participants : {participants}")
    print(f"[INFO] Test participant : {test_participant}")

    train, val, test = loso_split(df, test_participant)
    print(f"[INFO] Train: {len(train)} | Val: {len(val)} | Test: {len(test)}")

    X_train = train[FEATURE_COLS].values.astype(float)
    X_val   = val[FEATURE_COLS].values.astype(float)
    X_test  = test[FEATURE_COLS].values.astype(float)

    # Scaler (fit uniquement sur train)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s   = scaler.transform(X_val)
    X_test_s  = scaler.transform(X_test)

    os.makedirs("artifacts/baseline", exist_ok=True)
    os.makedirs("artifacts/scalers", exist_ok=True)
    joblib.dump(scaler, "artifacts/scalers/features_scaler_baseline.pkl")

    horizons = {0: 15, 1: 30, 2: 60}
    val_metrics, test_metrics = {}, {}

    for idx, h in horizons.items():
        y_train = train[TARGET_COLS[idx]].values
        y_val   = val[TARGET_COLS[idx]].values
        y_test  = test[TARGET_COLS[idx]].values

        # Point prediction
        lr = LinearRegression()
        lr.fit(X_train_s, y_train)

        # Quantile regressors for intervals
        q10 = QuantileRegressor(quantile=0.10, alpha=0.1, solver="highs")
        q90 = QuantileRegressor(quantile=0.90, alpha=0.1, solver="highs")
        q10.fit(X_train_s, y_train)
        q90.fit(X_train_s, y_train)

        joblib.dump(lr,  f"artifacts/baseline/lr_{h}_{version}.pkl")
        joblib.dump(q10, f"artifacts/baseline/lr_{h}_q10_{version}.pkl")
        joblib.dump(q90, f"artifacts/baseline/lr_{h}_q90_{version}.pkl")

        val_metrics[f"mae_{h}"]  = compute_metrics(y_val,  lr.predict(X_val_s))["mae"]
        test_metrics[f"mae_{h}"] = compute_metrics(y_test, lr.predict(X_test_s))["mae"]
        print(f"  @{h}min — val MAE: {val_metrics[f'mae_{h}']:.2f} | test MAE: {test_metrics[f'mae_{h}']:.2f}")

    save_report({
        "model": "baseline",
        "version": version,
        "test_participant": test_participant,
        "n_train": len(train),
        "n_val": len(val),
        "n_test": len(test),
        "val_metrics": val_metrics,
        "test_metrics": test_metrics,
    }, f"baseline_{version}")

    print(f"\n[OK] Baseline entraîné. Artefacts dans artifacts/baseline/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Entraîne le modèle Baseline")
    parser.add_argument("--data", default=DATA_PATH)
    parser.add_argument("--test-participant", default="001")
    parser.add_argument("--version", default="v1.0")
    args = parser.parse_args()
    main(args.data, args.test_participant, args.version)
