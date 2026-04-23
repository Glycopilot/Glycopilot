"""
Entraînement du modèle LSTM.

Usage :
    python training/train_lstm.py
    python training/train_lstm.py --data <chemin_csv> --test-participant 001 --version v1.0 --epochs 100 --device cpu
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from models.lstm import LSTMNet, N_FEATURES
from training.utils import (
    DATA_PATH, TARGET_COLS,
    load_and_engineer, loso_split, make_sequences, save_report, compute_metrics,
)

SEQ_LEN = 24
BATCH_SIZE = 64


def pinball_loss(pred: torch.Tensor, target: torch.Tensor, alpha: float) -> torch.Tensor:
    err = target - pred
    return torch.mean(torch.where(err >= 0, alpha * err, (alpha - 1) * err))


def combined_loss(out15, out30, out60, y: torch.Tensor) -> torch.Tensor:
    y15, y30, y60 = y[:, 0], y[:, 1], y[:, 2]
    loss = 0.0
    for out, target in [(out15, y15), (out30, y30), (out60, y60)]:
        loss += nn.functional.mse_loss(out[:, 0], target)
        loss += 0.5 * pinball_loss(out[:, 1], target, 0.10)
        loss += 0.5 * pinball_loss(out[:, 2], target, 0.90)
    return loss / 3


def main(data_path: str, test_participant: str, version: str, epochs: int, device: str) -> None:
    dev = torch.device(device)
    print(f"[INFO] Device : {dev}")
    print(f"[INFO] Chargement des données : {data_path}")
    df = load_and_engineer(data_path)

    print(f"[INFO] Test participant : {test_participant}")
    train_df, val_df, test_df = loso_split(df, test_participant)

    print("[INFO] Construction des séquences...")
    X_train, y_train = make_sequences(train_df, SEQ_LEN)
    X_val,   y_val   = make_sequences(val_df,   SEQ_LEN)
    X_test,  y_test  = make_sequences(test_df,  SEQ_LEN)
    print(f"[INFO] Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

    train_ds = TensorDataset(torch.tensor(X_train), torch.tensor(y_train))
    val_ds   = TensorDataset(torch.tensor(X_val),   torch.tensor(y_val))
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE)

    model = LSTMNet(n_features=N_FEATURES).to(dev)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

    best_val_loss = float("inf")
    patience_counter = 0
    PATIENCE = 15

    print(f"[INFO] Entraînement LSTM ({epochs} epochs max, early stopping patience={PATIENCE})...")
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        for xb, yb in train_loader:
            xb, yb = xb.to(dev), yb.to(dev)
            optimizer.zero_grad()
            o15, o30, o60 = model(xb)
            loss = combined_loss(o15, o30, o60, yb)
            loss.backward()
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
        val_loss   /= len(val_loader)
        scheduler.step(val_loss)

        if epoch % 10 == 0:
            print(f"  Epoch {epoch:3d}/{epochs} — train: {train_loss:.4f} | val: {val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            os.makedirs("artifacts/lstm", exist_ok=True)
            torch.save(model.state_dict(), f"artifacts/lstm/lstm_{version}.pt")
        else:
            patience_counter += 1
            if patience_counter >= PATIENCE:
                print(f"  Early stopping à l'epoch {epoch}.")
                break

    # Evaluate on test set
    model.load_state_dict(torch.load(f"artifacts/lstm/lstm_{version}.pt", map_location=dev))
    model.eval()
    X_test_t = torch.tensor(X_test).to(dev)
    with torch.no_grad():
        o15, o30, o60 = model(X_test_t)

    test_metrics = {}
    for h, out, idx in [(15, o15, 0), (30, o30, 1), (60, o60, 2)]:
        preds = out[:, 0].cpu().numpy()
        test_metrics[f"mae_{h}"] = compute_metrics(y_test[:, idx], preds)["mae"]
        print(f"  Test MAE @{h}min : {test_metrics[f'mae_{h}']:.2f} mg/dL")

    save_report({
        "model": "lstm",
        "version": version,
        "test_participant": test_participant,
        "n_train": len(X_train),
        "n_val": len(X_val),
        "n_test": len(X_test),
        "best_val_loss": round(best_val_loss, 4),
        "test_metrics": test_metrics,
    }, f"lstm_{version}")

    print(f"\n[OK] LSTM entraîné. Artefacts dans artifacts/lstm/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Entraîne le modèle LSTM")
    parser.add_argument("--data", default=DATA_PATH)
    parser.add_argument("--test-participant", default="001")
    parser.add_argument("--version", default="v1.0")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    args = parser.parse_args()
    main(args.data, args.test_participant, args.version, args.epochs, args.device)
