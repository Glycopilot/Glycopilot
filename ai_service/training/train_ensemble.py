"""
Entraînement du modèle Ensemble (stacking Ridge).

Nécessite que les 4 modèles précédents soient déjà entraînés :
  artifacts/baseline/lr_*_v1.0.pkl
  artifacts/xgboost/xgb_*_v1.0.pkl
  artifacts/lstm/lstm_v1.0.pt
  artifacts/transformer/transformer_v1.0.pt

Usage :
    python training/train_ensemble.py
    python training/train_ensemble.py --test-participant 001 --version v1.0 --sub-version v1.0
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import joblib
import numpy as np
from sklearn.linear_model import Ridge

from models.baseline import BaselineModel
from models.xgboost_model import XGBoostModel
from models.lstm import LSTMModel
from models.transformer import TransformerModel
from training.utils import (
    DATA_PATH, FEATURE_COLS,
    load_and_engineer, loso_split, make_sequences, save_report, compute_metrics,
)

SEQ_LEN = 24


def collect_predictions(
    baseline: BaselineModel,
    xgb: XGBoostModel,
    lstm: LSTMModel,
    transformer: TransformerModel,
    X_tab: np.ndarray,
    X_seq: np.ndarray,
) -> dict[int, np.ndarray]:
    """Returns dict {horizon: (N, 4)} with predictions from each sub-model."""
    import torch

    print("  [INFO] Prédictions Baseline...")
    X_bl = baseline._scaler.transform(X_tab) if baseline._scaler is not None else X_tab
    bl_preds = {h: baseline._models[h].predict(X_bl).astype(np.float32) for h in [15, 30, 60]}

    print("  [INFO] Prédictions XGBoost...")
    xgb_preds = {h: xgb._models[h].predict(X_tab).astype(np.float32) for h in [15, 30, 60]}

    print("  [INFO] Prédictions LSTM...")
    X_seq_t = torch.tensor(X_seq, dtype=torch.float32)
    import torch.nn as nn
    with torch.no_grad():
        o15, o30, o60 = lstm._net(X_seq_t)
    lstm_preds = {15: o15[:, 0].numpy(), 30: o30[:, 0].numpy(), 60: o60[:, 0].numpy()}

    print("  [INFO] Prédictions Transformer...")
    with torch.no_grad():
        t15, t30, t60 = transformer._net(X_seq_t)
    trans_preds = {15: t15[:, 0].numpy(), 30: t30[:, 0].numpy(), 60: t60[:, 0].numpy()}

    combined = {}
    for h in [15, 30, 60]:
        combined[h] = np.column_stack([bl_preds[h], xgb_preds[h], lstm_preds[h], trans_preds[h]])

    return combined


def main(data_path: str, test_participant: str, version: str, sub_version: str) -> None:
    print(f"[INFO] Chargement des données : {data_path}")
    df = load_and_engineer(data_path)
    train_df, val_df, test_df = loso_split(df, test_participant)

    # Sequences for LSTM/Transformer
    X_train_seq, y_train = make_sequences(train_df, SEQ_LEN)
    X_val_seq,   y_val   = make_sequences(val_df,   SEQ_LEN)
    X_test_seq,  y_test  = make_sequences(test_df,  SEQ_LEN)

    # Tabular = last timestep of each sequence → perfectly aligned
    X_train_tab_aligned = X_train_seq[:, -1, :]
    X_val_tab_aligned   = X_val_seq[:, -1, :]

    print("[INFO] Chargement des sous-modèles...")
    from core.config import settings

    baseline = BaselineModel()
    baseline._models = {
        h: joblib.load(f"artifacts/baseline/lr_{h}_{sub_version}.pkl")
        for h in [15, 30, 60]
        if os.path.exists(f"artifacts/baseline/lr_{h}_{sub_version}.pkl")
    }
    scaler_path = "artifacts/scalers/features_scaler_baseline.pkl"
    baseline._scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None
    baseline._loaded = True

    xgb = XGBoostModel()
    xgb._models = {
        h: joblib.load(f"artifacts/xgboost/xgb_{h}_{sub_version}.pkl")
        for h in [15, 30, 60]
        if os.path.exists(f"artifacts/xgboost/xgb_{h}_{sub_version}.pkl")
    }
    xgb._loaded = True

    import torch
    lstm = LSTMModel()
    lstm_path = f"artifacts/lstm/lstm_{sub_version}.pt"
    if os.path.exists(lstm_path):
        from models.lstm import LSTMNet, N_FEATURES
        lstm._net = LSTMNet(n_features=N_FEATURES)
        lstm._net.load_state_dict(torch.load(lstm_path, map_location="cpu", weights_only=True))
        lstm._net.eval()
        lstm._loaded = True
    else:
        print(f"[WARN] LSTM artifact non trouvé : {lstm_path}")

    transformer = TransformerModel()
    trans_path = f"artifacts/transformer/transformer_{sub_version}.pt"
    if os.path.exists(trans_path):
        from models.transformer import TransformerNet, N_FEATURES as TN
        transformer._net = TransformerNet(n_features=TN)
        transformer._net.load_state_dict(torch.load(trans_path, map_location="cpu", weights_only=True))
        transformer._net.eval()
        transformer._loaded = True
    else:
        print(f"[WARN] Transformer artifact non trouvé : {trans_path}")

    print("[INFO] Génération des prédictions val set pour le méta-modèle...")
    val_preds = collect_predictions(baseline, xgb, lstm, transformer, X_val_tab_aligned, X_val_seq)

    print("[INFO] Entraînement des méta-modèles Ridge...")
    os.makedirs("artifacts/ensemble", exist_ok=True)
    meta_models = {}
    val_metrics = {}

    for h, idx in [(15, 0), (30, 1), (60, 2)]:
        X_meta = val_preds[h]
        y_meta = y_val[:, idx]

        ridge = Ridge(alpha=100.0)
        ridge.fit(X_meta, y_meta)
        meta_models[f"y_hat_{h}"] = ridge

        val_metrics[f"mae_{h}"] = compute_metrics(y_meta, ridge.predict(X_meta))["mae"]
        print(f"  @{h}min — weights: {[round(c,3) for c in ridge.coef_]} | val MAE: {val_metrics[f'mae_{h}']:.2f}")

    joblib.dump(meta_models, f"artifacts/ensemble/ensemble_{version}.pkl")

    save_report({
        "model": "ensemble",
        "version": version,
        "sub_model_version": sub_version,
        "test_participant": test_participant,
        "sub_models": ["baseline", "xgboost", "lstm", "transformer"],
        "val_metrics": val_metrics,
    }, f"ensemble_{version}")

    print(f"\n[OK] Ensemble entraîné. Artefacts dans artifacts/ensemble/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Entraîne le modèle Ensemble (stacking)")
    parser.add_argument("--data", default=DATA_PATH)
    parser.add_argument("--test-participant", default="1")
    parser.add_argument("--version", default="v1.0")
    parser.add_argument("--sub-version", default="v1.0", help="Version des sous-modèles à agréger")
    args = parser.parse_args()
    main(args.data, args.test_participant, args.version, args.sub_version)
