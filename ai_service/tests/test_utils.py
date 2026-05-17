import json
import numpy as np
import pandas as pd
import pytest
import torch

from training.utils import (
    FEATURE_COLS,
    TARGET_COLS,
    compute_metrics,
    combined_loss,
    load_and_engineer,
    loso_split,
    make_sequences,
    pinball_loss,
    save_report,
)


def test_compute_metrics_perfect():
    y = np.array([100.0, 120.0, 80.0])
    result = compute_metrics(y, y)
    assert result["mae"] == 0.0
    assert result["rmse"] == 0.0


def test_compute_metrics_known_values():
    y_true = np.array([100.0, 200.0])
    y_pred = np.array([110.0, 190.0])
    result = compute_metrics(y_true, y_pred)
    assert result["mae"] == 10.0
    assert "rmse" in result
    assert "mard" in result


def test_compute_metrics_returns_rounded():
    y_true = np.array([100.0, 101.0, 99.0])
    y_pred = np.array([100.1, 101.1, 99.1])
    result = compute_metrics(y_true, y_pred)
    assert isinstance(result["mae"], float)
    assert len(str(result["mae"]).split(".")[-1]) <= 3


def test_pinball_loss_alpha_05_symmetric():
    pred = torch.tensor([1.0])
    target = torch.tensor([1.0])
    loss = pinball_loss(pred, target, 0.5)
    assert float(loss) == 0.0


def test_pinball_loss_positive_error():
    pred = torch.tensor([0.0])
    target = torch.tensor([1.0])
    loss_10 = pinball_loss(pred, target, 0.10)
    loss_90 = pinball_loss(pred, target, 0.90)
    assert float(loss_90) > float(loss_10)


def test_combined_loss_shape():
    B = 8
    o15 = torch.randn(B, 3)
    o30 = torch.randn(B, 3)
    o60 = torch.randn(B, 3)
    y = torch.randn(B, 3)
    loss = combined_loss(o15, o30, o60, y)
    assert loss.dim() == 0
    assert float(loss) >= 0.0


def _raw_training_dataframe(participants=(1, 2), rows_per_participant=36):
    rows = []
    for pid in participants:
        for i in range(rows_per_participant):
            rows.append(
                {
                    "participant_id": pid,
                    "datetime": pd.Timestamp("2024-01-01") + pd.Timedelta(minutes=5 * i),
                    "glucose": 100.0 + pid + i,
                    "glucose_roc": 0.1 * i,
                    "hr_mean_5min": 70.0 + i,
                    "hr_std_5min": 5.0,
                    "hrv_rmssd_5min": 30.0,
                    "temp_mean_5min": 36.5,
                    "hba1c": 6.5,
                    "gender_is_female": float(pid % 2),
                    "glucose_target_30min": 106.0 + pid + i,
                }
            )
    return pd.DataFrame(rows)


def test_load_and_engineer_creates_features_and_targets(tmp_path):
    csv_path = tmp_path / "glycemia.csv"
    _raw_training_dataframe().to_csv(csv_path, index=False)

    df = load_and_engineer(str(csv_path))

    assert set(FEATURE_COLS).issubset(df.columns)
    assert set(TARGET_COLS).issubset(df.columns)
    assert df[FEATURE_COLS + TARGET_COLS].isna().sum().sum() == 0
    assert df["participant_id"].nunique() == 2


def test_loso_split_keeps_requested_participant_for_test(tmp_path):
    csv_path = tmp_path / "glycemia.csv"
    _raw_training_dataframe(participants=(1, 2, 3)).to_csv(csv_path, index=False)
    df = load_and_engineer(str(csv_path))

    train, val, test = loso_split(df, "2")

    assert set(test["participant_id"]) == {2}
    assert 2 not in set(train["participant_id"])
    assert 2 not in set(val["participant_id"])
    assert len(train) > len(val) > 0


def test_make_sequences_builds_expected_shapes(tmp_path):
    csv_path = tmp_path / "glycemia.csv"
    _raw_training_dataframe(participants=(1,), rows_per_participant=48).to_csv(csv_path, index=False)
    df = load_and_engineer(str(csv_path))

    X, y = make_sequences(df, seq_len=4)

    assert X.shape[1:] == (4, len(FEATURE_COLS))
    assert y.shape[1] == len(TARGET_COLS)
    assert X.dtype == np.float32
    assert y.dtype == np.float32


def test_save_report_writes_metadata_file(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)

    save_report({"model": "unit-test"}, "unit")

    report_path = tmp_path / "artifacts" / "metadata" / "training_report_unit.json"
    assert report_path.exists()
    data = json.loads(report_path.read_text())
    assert data["model"] == "unit-test"
    assert "saved_at" in data
