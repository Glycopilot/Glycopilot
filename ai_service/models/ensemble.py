"""
Ensemble: aggregates Baseline, LSTM, and Transformer predictions.
Uses stacking (Ridge meta-model) when artifacts available,
falls back to weighted average otherwise.
"""
from __future__ import annotations

import os
import numpy as np
import joblib

from core.config import settings
from core.logger import get_logger
from api.schemas import PredictResponse, Predictions, HorizonPrediction, SubModelResult
from models.baseline import baseline_model
from models.lstm import lstm_model
from models.transformer import transformer_model
from models.xgboost_model import xgboost_model

logger = get_logger(__name__)

FALLBACK_WEIGHTS = {
    ("baseline", "xgboost", "lstm", "transformer"): (0.10, 0.30, 0.30, 0.30),
    ("baseline", "xgboost", "lstm"): (0.15, 0.40, 0.45),
    ("baseline", "xgboost", "transformer"): (0.15, 0.40, 0.45),
    ("baseline", "lstm", "transformer"): (0.15, 0.40, 0.45),
    ("baseline", "xgboost"): (0.30, 0.70),
    ("baseline", "lstm"): (0.35, 0.65),
    ("baseline", "transformer"): (0.30, 0.70),
    ("baseline",): (1.0,),
}


def _recommendation(predictions: dict, current_value: float) -> tuple[str, str]:
    r30 = predictions[30]
    r60 = predictions[60]

    if r30["risk_hypo"] > 0.7:
        return "Risque d'hypoglycémie dans 30 min. Consommez 15g de glucides rapides.", "alert"
    if r30["risk_hypo"] > 0.4:
        return "Tendance à la baisse détectée. Surveillez votre glycémie dans les prochaines minutes.", "warning"
    if r60["risk_hypo"] > 0.5:
        return "Légère tendance à la baisse sur 60 min. Restez attentif.", "watch"
    if r30["risk_hyper"] > 0.7:
        return "Risque d'hyperglycémie dans 30 min. Vérifiez votre dernière dose d'insuline.", "alert"
    if r30["risk_hyper"] > 0.4:
        return "Glycémie en hausse modérée. Restez attentif.", "warning"
    if 70 <= r30["y_hat"] <= 180:
        return "Glycémie stable. Continuez votre activité normale.", "info"
    return "Vérifiez votre glycémie manuellement.", "watch"


class EnsembleModel:
    def __init__(self) -> None:
        self._meta_models: dict = {}
        self._loaded = False

    def load(self) -> None:
        baseline_model.load()
        xgboost_model.load()
        lstm_model.load()
        transformer_model.load()

        path = os.path.join(settings.artifacts_dir, "ensemble", "ensemble_v1.0.pkl")
        if os.path.exists(path):
            self._meta_models = joblib.load(path)
            logger.info("Ensemble meta-models loaded.")
        else:
            logger.warning("Ensemble artifact not found — will use weighted average fallback.")

        self._loaded = True

    def models_loaded(self) -> dict[str, bool]:
        return {
            "baseline": baseline_model.is_loaded(),
            "xgboost": xgboost_model.is_loaded(),
            "lstm": lstm_model.is_loaded(),
            "transformer": transformer_model.is_loaded(),
            "ensemble": bool(self._meta_models),
        }

    def predict(self, features: np.ndarray, request) -> PredictResponse:
        sub_preds: dict[str, dict] = {}

        sub_preds["baseline"] = baseline_model.predict(features)

        xgb_result = xgboost_model.predict(features)
        if xgb_result:
            sub_preds["xgboost"] = xgb_result

        lstm_result = lstm_model.predict(features)
        if lstm_result:
            sub_preds["lstm"] = lstm_result

        transformer_result = transformer_model.predict(features)
        if transformer_result:
            sub_preds["transformer"] = transformer_result

        available = tuple(sub_preds.keys())
        final: dict[int, dict] = {}

        for h in [15, 30, 60]:
            if self._meta_models and all(m in sub_preds for m in ["baseline", "xgboost", "lstm", "transformer"]):
                # Stacking via meta-model
                X_meta = np.array([[sub_preds[m][h]["y_hat"] for m in ["baseline", "xgboost", "lstm", "transformer"]]])
                meta_key = f"y_hat_{h}"
                if meta_key in self._meta_models:
                    y_hat = float(self._meta_models[meta_key].predict(X_meta)[0])
                else:
                    y_hat = float(np.mean([sub_preds[m][h]["y_hat"] for m in available]))
            else:
                # Weighted average fallback
                weights = FALLBACK_WEIGHTS.get(available, tuple(1.0 / len(available) for _ in available))
                y_hat = float(sum(w * sub_preds[m][h]["y_hat"] for w, m in zip(weights, available)))

            # Aggregate p10/p90 as min/max across sub-models
            all_p10 = [sub_preds[m][h]["p10"] for m in available]
            all_p90 = [sub_preds[m][h]["p90"] for m in available]
            all_risk_hypo = [sub_preds[m][h]["risk_hypo"] for m in available]
            all_risk_hyper = [sub_preds[m][h]["risk_hyper"] for m in available]

            final[h] = {
                "y_hat": round(y_hat, 2),
                "p10": round(min(all_p10), 2),
                "p90": round(max(all_p90), 2),
                "risk_hypo": round(max(all_risk_hypo), 4),
                "risk_hyper": round(max(all_risk_hyper), 4),
            }

        # Confidence = 1 - normalized std across sub-models on y_hat_30
        y_hat_30_vals = [sub_preds[m][30]["y_hat"] for m in available]
        confidence = float(np.clip(1 - np.std(y_hat_30_vals) / (np.mean(y_hat_30_vals) + 1e-6), 0.0, 1.0))

        status = "ok"
        if confidence < 0.5:
            status = "low_confidence"

        current_value = float(request.readings[-1].value)
        rec_text, rec_level = _recommendation(final, current_value)

        source = "ensemble" if len(available) > 1 else available[0]

        return PredictResponse(
            status=status,
            source=source,
            confidence=round(confidence, 4),
            predictions=Predictions(
                horizon_15=HorizonPrediction(**final[15]),
                horizon_30=HorizonPrediction(**final[30]),
                horizon_60=HorizonPrediction(**final[60]),
            ),
            recommendation=rec_text,
            recommendation_level=rec_level,
            sub_models={
                m: SubModelResult(
                    y_hat_30=sub_preds[m][30]["y_hat"],
                    confidence=None,
                )
                for m in available
            },
            model_version=settings.model_version,
        )


ensemble_model = EnsembleModel()
