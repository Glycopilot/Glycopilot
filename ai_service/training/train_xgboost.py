"""
Entraînement du modèle XGBoost.

Usage :
    python training/train_xgboost.py
    python training/train_xgboost.py --data <chemin_csv> --test-participant 001 --version v1.0
"""
import argparse
import json
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


def compute_sample_weights(y: np.ndarray, horizon: int = 15) -> np.ndarray:
    """Higher weight for predictions near/in hypo or hyper zones.
    Reduced critical weight for @60min (higher uncertainty at longer horizon)."""
    critical_weight = 30.0 if horizon == 60 else 50.0
    weights = np.ones(len(y), dtype=np.float32)
    weights[y < 70] = critical_weight
    weights[(y >= 70) & (y < 90)] = 10.0
    weights[(y > 160) & (y <= 180)] = 10.0
    weights[y > 180] = critical_weight
    return weights


XGB_PARAMS = dict(
    n_estimators=500,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,
    reg_alpha=0.1,
    reg_lambda=1.0,
    random_state=42,
    n_jobs=-1,
    verbosity=0,
)

# Paramètres spécifiques par horizon — horizons longs = arbres moins profonds + LR plus élevé
HORIZON_PARAMS = {
    15: dict(max_depth=6, learning_rate=0.05, early_stopping_rounds=20),
    30: dict(max_depth=6, learning_rate=0.05, early_stopping_rounds=20),
    60: dict(max_depth=6, learning_rate=0.05, early_stopping_rounds=20),
}


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
    history = {}

    for idx, h in horizons.items():
        y_train = train[TARGET_COLS[idx]].values
        y_val   = val[TARGET_COLS[idx]].values
        y_test  = test[TARGET_COLS[idx]].values

        print(f"\n  [INFO] Entraînement XGBoost @{h}min...")
        sw = compute_sample_weights(y_train, horizon=h)
        hp = HORIZON_PARAMS[h]

        # Point prediction avec paramètres et early stopping par horizon
        xgb = XGBRegressor(
            objective="reg:squarederror",
            max_depth=hp["max_depth"],
            learning_rate=hp["learning_rate"],
            early_stopping_rounds=hp["early_stopping_rounds"],
            **XGB_PARAMS,
        )
        xgb.fit(
            X_train, y_train,
            sample_weight=sw,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )
        history[f"{h}min"] = {
            "val_rmse": xgb.evals_result_["validation_0"]["rmse"],
            "best_iteration": xgb.best_iteration,
        }
        print(f"  Best iteration: {xgb.best_iteration}/{XGB_PARAMS['n_estimators']}")

        # Quantile regressors for p10/p90
        xgb_q10 = XGBRegressor(objective="reg:quantileerror", quantile_alpha=0.10, **XGB_PARAMS)
        xgb_q90 = XGBRegressor(objective="reg:quantileerror", quantile_alpha=0.90, **XGB_PARAMS)
        xgb_q10.fit(X_train, y_train, sample_weight=sw, verbose=False)
        xgb_q90.fit(X_train, y_train, sample_weight=sw, verbose=False)

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

    with open(f"artifacts/xgboost/history_{version}.json", "w") as f:
        json.dump(history, f, indent=2)
    print(f"[OK] Historique sauvegardé : artifacts/xgboost/history_{version}.json")

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
