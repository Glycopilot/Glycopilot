import numpy as np
import pytest
import torch

from training.utils import compute_metrics, pinball_loss, combined_loss


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
