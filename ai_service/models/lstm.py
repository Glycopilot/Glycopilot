"""
LSTM model for multi-horizon glucose prediction.
Architecture: 2-layer LSTM → FC → 3 output heads (15/30/60 min).
Each head outputs [y_hat, p10, p90].
"""
from __future__ import annotations

import os
import numpy as np

from core.config import settings
from core.logger import get_logger

logger = get_logger(__name__)

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not installed. LSTM model will not be available.")

N_FEATURES = 25  # must match training/utils.py FEATURE_COLS length


class LSTMNet(nn.Module if TORCH_AVAILABLE else object):
    def __init__(self, n_features: int = N_FEATURES, hidden1: int = 128, hidden2: int = 64) -> None:
        super().__init__()
        self.lstm1 = nn.LSTM(n_features, hidden1, batch_first=True)
        self.lstm2 = nn.LSTM(hidden1, hidden2, batch_first=True)
        self.dropout = nn.Dropout(0.3)
        self.fc = nn.Sequential(nn.Linear(hidden2, 32), nn.ReLU())
        self.head_15 = nn.Linear(32, 3)
        self.head_30 = nn.Linear(32, 3)
        self.head_60 = nn.Linear(32, 3)

    def forward(self, x):
        out, _ = self.lstm1(x)
        out, _ = self.lstm2(out)
        out = self.dropout(out[:, -1, :])
        out = self.fc(out)
        return self.head_15(out), self.head_30(out), self.head_60(out)


def _risk_sigmoid(y_hat: float, threshold: float, direction: str, temperature: float = 10.0) -> float:
    import math
    if direction == "hypo":
        return float(1 / (1 + math.exp((y_hat - threshold) / temperature)))
    return float(1 / (1 + math.exp(-(y_hat - threshold) / temperature)))


class LSTMModel:
    def __init__(self) -> None:
        self._net = None
        self._loaded = False

    def load(self) -> None:
        if not TORCH_AVAILABLE:
            return
        path = os.path.join(settings.artifacts_dir, "lstm", "lstm_v1.0.pt")
        if not os.path.exists(path):
            logger.warning("LSTM artifact not found: %s", path)
            return
        self._net = LSTMNet()
        self._net.load_state_dict(torch.load(path, map_location="cpu"))
        self._net.eval()
        self._loaded = True
        logger.info("LSTM model loaded.")

    def is_loaded(self) -> bool:
        return self._loaded

    def predict(self, features: np.ndarray) -> dict | None:
        if not self._loaded or not TORCH_AVAILABLE:
            return None
        x = torch.tensor(features, dtype=torch.float32).unsqueeze(0)  # (1, seq, feat)
        with torch.no_grad():
            h15, h30, h60 = self._net(x)

        results = {}
        for h, raw in [(15, h15), (30, h30), (60, h60)]:
            vals = raw.squeeze(0).tolist()
            y_hat = vals[0]
            results[h] = {
                "y_hat": round(y_hat, 2),
                "p10": round(vals[1], 2),
                "p90": round(vals[2], 2),
                "risk_hypo": _risk_sigmoid(y_hat, 70.0, "hypo"),
                "risk_hyper": _risk_sigmoid(y_hat, 180.0, "hyper"),
            }
        return results


lstm_model = LSTMModel()
