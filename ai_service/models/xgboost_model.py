"""
XGBoost model for multi-horizon glucose prediction.
Uses the last timestep features (tabular) — very effective at short horizons (15 min).
One XGBRegressor per horizon (15/30/60 min), plus quantile regressors for p10/p90.
"""
from __future__ import annotations

import os
import numpy as np
import joblib

from core.config import settings
from core.logger import get_logger

logger = get_logger(__name__)

try:
    from xgboost import XGBRegressor
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False
    logger.warning("XGBoost not installed.")

HORIZONS = [15, 30, 60]


def _risk(y_hat: float, threshold: float, direction: str, scale: float = 25.0) -> float:
    if direction == "hypo":
        return float(np.clip((threshold - y_hat) / scale, 0.0, 1.0))
    return float(np.clip((y_hat - threshold) / scale, 0.0, 1.0))


class XGBoostModel:
    def __init__(self) -> None:
        # point prediction models
        self._models: dict[int, object] = {}
        # quantile models for p10/p90
        self._q10_models: dict[int, object] = {}
        self._q90_models: dict[int, object] = {}
        self._loaded = False

    def load(self) -> None:
        if not XGB_AVAILABLE:
            return
        base = os.path.join(settings.artifacts_dir, "xgboost")
        all_ok = True
        for h in HORIZONS:
            for attr, fname in [
                ("_models", f"xgb_{h}_v1.0.pkl"),
                ("_q10_models", f"xgb_{h}_q10_v1.0.pkl"),
                ("_q90_models", f"xgb_{h}_q90_v1.0.pkl"),
            ]:
                path = os.path.join(base, fname)
                if os.path.exists(path):
                    getattr(self, attr)[h] = joblib.load(path)
                else:
                    logger.warning("XGBoost artifact not found: %s", path)
                    all_ok = False

        self._loaded = bool(self._models)
        if all_ok:
            logger.info("XGBoost models loaded.")

    def is_loaded(self) -> bool:
        return self._loaded

    def predict(self, features: np.ndarray) -> dict | None:
        if not self._loaded or not XGB_AVAILABLE:
            return None

        flat = features[-1].reshape(1, -1)  # last timestep, shape (1, N_features)
        results = {}

        for h in HORIZONS:
            model = self._models.get(h)
            if model is None:
                return None
            y_hat = float(model.predict(flat)[0])

            q10_model = self._q10_models.get(h)
            q90_model = self._q90_models.get(h)
            p10 = float(q10_model.predict(flat)[0]) if q10_model else y_hat - 12.0
            p90 = float(q90_model.predict(flat)[0]) if q90_model else y_hat + 12.0

            results[h] = {
                "y_hat": round(y_hat, 2),
                "p10": round(p10, 2),
                "p90": round(p90, 2),
                "risk_hypo": _risk(y_hat, 70.0, "hypo"),
                "risk_hyper": _risk(y_hat, 180.0, "hyper"),
            }
        return results


xgboost_model = XGBoostModel()
