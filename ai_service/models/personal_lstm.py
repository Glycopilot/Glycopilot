"""
Gestionnaire des modèles LSTM personnels (fine-tunés par patient).

Charge les modèles à la demande avec cache en mémoire.
Recharge automatiquement si le fichier a été mis à jour (après fine-tuning).
"""
from __future__ import annotations

import os
import torch
from models.lstm import LSTMNet, N_FEATURES
from core.logger import get_logger

logger = get_logger(__name__)

N_EXTRA_FEATURES = 7
N_FEATURES_PERSONAL = N_FEATURES + N_EXTRA_FEATURES  # 30 + 7 = 37


class PersonalLSTMManager:
    def __init__(self) -> None:
        # patient_id -> (model, file_mtime)
        self._cache: dict[str, tuple[LSTMNet, float]] = {}

    def _model_path(self, patient_id: str, version: str) -> str:
        from core.config import settings
        return os.path.join(settings.artifacts_dir, "patients", patient_id, f"lstm_personal_{version}.pt")

    def get_model(self, patient_id: str, version: str) -> LSTMNet | None:
        """Return the personal LSTM for this patient, or None if not available."""
        path = self._model_path(patient_id, version)
        if not os.path.exists(path):
            return None

        mtime = os.path.getmtime(path)
        cached = self._cache.get(patient_id)

        if cached is not None and cached[1] == mtime:
            return cached[0]

        try:
            model = LSTMNet(n_features=N_FEATURES_PERSONAL)
            model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
            model.eval()
            self._cache[patient_id] = (model, mtime)
            logger.info(f"Modèle personnel chargé pour patient {patient_id}")
            return model
        except Exception as exc:
            logger.error(f"Impossible de charger le modèle personnel {patient_id}: {exc}")
            return None

    def has_model(self, patient_id: str, version: str) -> bool:
        return os.path.exists(self._model_path(patient_id, version))

    def invalidate(self, patient_id: str) -> None:
        """Remove from cache after a fine-tuning run."""
        self._cache.pop(patient_id, None)

    def predict(self, patient_id: str, version: str, personal_features) -> dict | None:
        """
        Run inference with the personal model.
        Returns sub-model result dict {15: {...}, 30: {...}, 60: {...}} or None.
        """
        import numpy as np
        model = self.get_model(patient_id, version)
        if model is None:
            return None

        x = personal_features
        if not isinstance(x, __import__("torch").Tensor):
            x = __import__("torch").tensor(x, dtype=__import__("torch").float32)
        if x.dim() == 2:
            x = x.unsqueeze(0)  # (1, seq_len, features)

        with __import__("torch").no_grad():
            o15, o30, o60 = model(x)

        result = {}
        for h, out in [(15, o15), (30, o30), (60, o60)]:
            y_hat = float(out[0, 0])
            p10   = float(out[0, 1])
            p90   = float(out[0, 2])
            result[h] = {
                "y_hat": round(y_hat, 2),
                "p10":   round(min(p10, y_hat), 2),
                "p90":   round(max(p90, y_hat), 2),
                "risk_hypo":  round(float(np.clip(1 - (y_hat - 70) / 30, 0, 1)), 4) if y_hat < 100 else 0.0,
                "risk_hyper": round(float(np.clip((y_hat - 160) / 40, 0, 1)), 4) if y_hat > 140 else 0.0,
            }
        return result


personal_lstm_manager = PersonalLSTMManager()
