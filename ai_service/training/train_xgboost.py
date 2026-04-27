"""
Entraînement du modèle XGBoost.

Usage :
    python training/train_xgboost.py
    python training/train_xgboost.py --data <chemin_csv> --test-participant 001 --version v1.0
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import joblib
import numpy as np
from xgboost import XGBRegressor

from training.utils import (
    DATA_PATH, FEATURE_COLS, TARGET_COLS,
    load_and_engineer, loso_split, save_report, compute_metrics,
)


XGB_PARAMS = dict(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,
    reg_alpha=0.1,
    reg_lambda=1.0,
    random_state=42,
    n_jobs=-1,
    verbosity=0,
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

    os.makedirs("artifacts/xgboost", exist_ok=True)

    horizons = {0: 15, 1: 30, 2: 60}
    val_metrics, test_metrics = {}, {}

    for idx, h in horizons.items():
        y_train = train[TARGET_COLS[idx]].values
        y_val   = val[TARGET_COLS[idx]].values
        y_test  = test[TARGET_COLS[idx]].values

        print(f"\n  [INFO] Entraînement XGBoost @{h}min...")

        # Point prediction
        xgb = XGBRegressor(objective="reg:squarederror", **XGB_PARAMS)
        xgb.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        # Quantile regressors for p10/p90
        xgb_q10 = XGBRegressor(objective="reg:quantileerror", quantile_alpha=0.10, **XGB_PARAMS)
        xgb_q90 = XGBRegressor(objective="reg:quantileerror", quantile_alpha=0.90, **XGB_PARAMS)
        xgb_q10.fit(X_train, y_train, verbose=False)
        xgb_q90.fit(X_train, y_train, verbose=False)

        joblib.dump(xgb,     f"artifacts/xgboost/xgb_{h}_{version}.pkl")
        joblib.dump(xgb_q10, f"artifacts/xgboost/xgb_{h}_q10_{version}.pkl")
        joblib.dump(xgb_q90, f"artifacts/xgboost/xgb_{h}_q90_{version}.pkl")

        val_metrics[f"mae_{h}"]  = compute_metrics(y_val,  xgb.predict(X_val))["mae"]
        test_metrics[f"mae_{h}"] = compute_metrics(y_test, xgb.predict(X_test))["mae"]
        print(f"  @{h}min — val MAE: {val_metrics[f'mae_{h}']:.2f} | test MAE: {test_metrics[f'mae_{h}']:.2f}")

        # Feature importances (top 10)
        importances = xgb.feature_importances_
        top_idx = np.argsort(importances)[-10:][::-1]
        print(f"  Top features @{h}min :")
        for i in top_idx:
            print(f"    {FEATURE_COLS[i]:<30} {importances[i]:.4f}")

    save_report({
        "model": "xgboost",
        "version": version,
        "test_participant": test_participant,
        "n_train": len(train),
        "n_val": len(val),
        "n_test": len(test),
        "hyperparams": XGB_PARAMS,
        "val_metrics": val_metrics,
        "test_metrics": test_metrics,
    }, f"xgboost_{version}")

    print(f"\n[OK] XGBoost entraîné. Artefacts dans artifacts/xgboost/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Entraîne le modèle XGBoost")
    parser.add_argument("--data", default=DATA_PATH)
    parser.add_argument("--test-participant", default="1")
    parser.add_argument("--version", default="v1.0")
    args = parser.parse_args()
    main(args.data, args.test_participant, args.version)
