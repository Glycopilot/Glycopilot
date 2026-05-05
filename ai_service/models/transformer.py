"""
Transformer encoder model for multi-horizon glucose prediction.
Architecture: Linear projection → Positional encoding →
              4× TransformerEncoderLayer → GAP → 3 output heads.
"""
from __future__ import annotations

import math
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

N_FEATURES = 25
D_MODEL = 64


class PositionalEncoding(nn.Module if TORCH_AVAILABLE else object):
    def __init__(self, d_model: int, max_len: int = 512) -> None:
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len).unsqueeze(1).float()
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x):
        return x + self.pe[:, : x.size(1)]


class TransformerNet(nn.Module if TORCH_AVAILABLE else object):
    def __init__(self, n_features: int = N_FEATURES, d_model: int = D_MODEL) -> None:
        super().__init__()
        self.input_proj = nn.Linear(n_features, d_model)
        self.pos_enc = PositionalEncoding(d_model)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=4, dim_feedforward=256,
            dropout=0.2, activation="gelu", batch_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=4)
        self.head_15 = nn.Linear(d_model, 3)
        self.head_30 = nn.Linear(d_model, 3)
        self.head_60 = nn.Linear(d_model, 3)

    def forward(self, x):
        x = self.input_proj(x)
        x = self.pos_enc(x)
        x = self.encoder(x)
        x = x.mean(dim=1)  # global average pooling
        return self.head_15(x), self.head_30(x), self.head_60(x)


def _risk_sigmoid(y_hat: float, threshold: float, direction: str, temperature: float = 10.0) -> float:
    return float(1 / (1 + math.exp((y_hat - threshold) / temperature if direction == "hypo" else -(y_hat - threshold) / temperature)))


class TransformerModel:
    def __init__(self) -> None:
        self._net = None
        self._loaded = False

    def load(self) -> None:
        if not TORCH_AVAILABLE:
            return
        path = os.path.join(settings.artifacts_dir, "transformer", "transformer_v1.0.pt")
        if not os.path.exists(path):
            logger.warning("Transformer artifact not found: %s", path)
            return
        self._net = TransformerNet()
        self._net.load_state_dict(torch.load(path, map_location="cpu"))
        self._net.eval()
        self._loaded = True
        logger.info("Transformer model loaded.")

    def is_loaded(self) -> bool:
        return self._loaded

    def predict(self, features: np.ndarray) -> dict | None:
        if not self._loaded or not TORCH_AVAILABLE:
            return None
        x = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
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


transformer_model = TransformerModel()
