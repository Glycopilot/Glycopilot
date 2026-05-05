"""
Baseline model: Linear Regression per horizon.
Falls back to persistence model if artifacts not found.
"""
from __future__ import annotations

import os
import numpy as np
import joblib

from core.config import settings
from core.logger import get_logger

logger = get_logger(__name__)


def _risk(y_hat: float, threshold: float, direction: str, scale: float = 30.0) -> float:
    if direction == "hypo":
        return float(np.clip((threshold - y_hat) / scale, 0.0, 1.0))
    return float(np.clip((y_hat - threshold) / scale, 0.0, 1.0))


class BaselineModel:
    def __init__(self) -> None:
        self._models: dict[int, object] = {}
        self._q10: dict[int, object] = {}
        self._q90: dict[int, object] = {}
        self._scaler = None
        self._loaded = False

    def load(self) -> None:
        base = settings.artifacts_dir
        all_ok = True

        # Scaler
        scaler_path = os.path.join(base, "scalers", "features_scaler_baseline.pkl")
        if os.path.exists(scaler_path):
            self._scaler = joblib.load(scaler_path)
        else:
            logger.warning("Baseline scaler not found: %s — features won't be scaled", scaler_path)
            all_ok = False

        for h in [15, 30, 60]:
            lr_path  = os.path.join(base, "baseline", f"lr_{h}_v1.0.pkl")
            q10_path = os.path.join(base, "baseline", f"lr_{h}_q10_v1.0.pkl")
            q90_path = os.path.join(base, "baseline", f"lr_{h}_q90_v1.0.pkl")

            if os.path.exists(lr_path):
                self._models[h] = joblib.load(lr_path)
            else:
                logger.warning("Baseline artifact not found: %s — using persistence", lr_path)
                self._models[h] = None
                all_ok = False

            self._q10[h] = joblib.load(q10_path) if os.path.exists(q10_path) else None
            self._q90[h] = joblib.load(q90_path) if os.path.exists(q90_path) else None

        self._loaded = True
        if all_ok:
            logger.info("Baseline model loaded (LR + quantiles + scaler).")

    def is_loaded(self) -> bool:
        return self._loaded and any(m is not None for m in self._models.values())

    def predict(self, features: np.ndarray) -> dict:
        """
        features: (seq_len, N_features)
        Returns dict with y_hat/p10/p90/risk_hypo/risk_hyper for each horizon.
        """
        flat = features[-1].reshape(1, -1)  # last timestep, shape (1, N_features)

        if self._scaler is not None:
            flat_scaled = self._scaler.transform(flat)
        else:
            flat_scaled = flat

        current_value = float(features[-1, 0])
        results = {}

        for h in [15, 30, 60]:
            model = self._models.get(h)
            if model is not None:
                y_hat = float(model.predict(flat_scaled)[0])
                p10 = float(self._q10[h].predict(flat_scaled)[0]) if self._q10.get(h) else y_hat - 15.0
                p90 = float(self._q90[h].predict(flat_scaled)[0]) if self._q90.get(h) else y_hat + 15.0
            else:
                y_hat = current_value
                p10 = y_hat - 15.0
                p90 = y_hat + 15.0

            results[h] = {
                "y_hat": round(y_hat, 2),
                "p10":   round(p10, 2),
                "p90":   round(p90, 2),
                "risk_hypo":  _risk(y_hat, 70.0,  "hypo"),
                "risk_hyper": _risk(y_hat, 180.0, "hyper"),
            }
        return results


baseline_model = BaselineModel()
