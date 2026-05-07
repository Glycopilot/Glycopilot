import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import numpy as np
import pytest
from unittest.mock import MagicMock, patch

from models.ensemble import _recommendation, EnsembleModel, FALLBACK_WEIGHTS


# --- _recommendation ---

def _make_preds(y30=120.0, y60=120.0, risk_hypo30=0.0, risk_hypo60=0.0,
                risk_hyper30=0.0, risk_hyper60=0.0):
    def horizon(y, rh, rp):
        return {"y_hat": y, "p10": y - 10, "p90": y + 10,
                "risk_hypo": rh, "risk_hyper": rp}
    return {
        15: horizon(120.0, 0.0, 0.0),
        30: horizon(y30, risk_hypo30, risk_hyper30),
        60: horizon(y60, risk_hypo60, risk_hyper60),
    }

def test_recommendation_stable():
    preds = _make_preds(y30=120.0)
    text, level = _recommendation(preds, 120.0)
    assert level == "info"
    assert "stable" in text.lower()

def test_recommendation_hypo_alert():
    preds = _make_preds(risk_hypo30=0.8)
    text, level = _recommendation(preds, 60.0)
    assert level == "alert"
    assert "hypoglycémie" in text.lower()

def test_recommendation_hypo_warning():
    preds = _make_preds(risk_hypo30=0.5)
    text, level = _recommendation(preds, 75.0)
    assert level == "warning"

def test_recommendation_hypo_watch_60():
    preds = _make_preds(risk_hypo30=0.2, risk_hypo60=0.6)
    text, level = _recommendation(preds, 90.0)
    assert level == "watch"

def test_recommendation_hyper_alert():
    preds = _make_preds(risk_hyper30=0.8)
    text, level = _recommendation(preds, 200.0)
    assert level == "alert"
    assert "hyperglycémie" in text.lower()

def test_recommendation_hyper_warning():
    preds = _make_preds(risk_hyper30=0.5)
    text, level = _recommendation(preds, 170.0)
    assert level == "warning"

def test_recommendation_out_of_range_watch():
    preds = _make_preds(y30=200.0)
    text, level = _recommendation(preds, 200.0)
    assert level == "watch"


# --- FALLBACK_WEIGHTS ---

def test_fallback_weights_sum_to_one():
    for combo, weights in FALLBACK_WEIGHTS.items():
        assert abs(sum(weights) - 1.0) < 1e-6, f"Weights don't sum to 1 for {combo}"

def test_fallback_weights_baseline_only():
    assert FALLBACK_WEIGHTS[("baseline",)] == (1.0,)


# --- EnsembleModel.models_loaded ---

def test_ensemble_models_loaded_all_false():
    model = EnsembleModel()
    with patch("models.ensemble.baseline_model") as b, \
         patch("models.ensemble.xgboost_model") as x, \
         patch("models.ensemble.lstm_model") as l, \
         patch("models.ensemble.transformer_model") as t:
        b.is_loaded.return_value = False
        x.is_loaded.return_value = False
        l.is_loaded.return_value = False
        t.is_loaded.return_value = False
        loaded = model.models_loaded()
    assert loaded == {
        "baseline": False, "xgboost": False,
        "lstm": False, "transformer": False, "ensemble": False,
    }


# --- EnsembleModel.predict — weighted average fallback ---

def _sub_pred(y_hat):
    return {h: {"y_hat": y_hat, "p10": y_hat - 5, "p90": y_hat + 5,
                "risk_hypo": 0.0, "risk_hyper": 0.0}
            for h in [15, 30, 60]}

def _make_fake_request(current_value=120.0):
    req = MagicMock()
    reading = MagicMock()
    reading.value = current_value
    req.readings = [reading]
    req.user_id = "test-patient"
    return req

def test_ensemble_predict_weighted_average_baseline_only():
    model = EnsembleModel()
    model._loaded = True

    with patch("models.ensemble.baseline_model") as b, \
         patch("models.ensemble.xgboost_model") as x, \
         patch("models.ensemble.lstm_model") as l, \
         patch("models.ensemble.transformer_model") as t, \
         patch("models.personal_lstm.personal_lstm_manager") as pm:

        b.predict.return_value = _sub_pred(100.0)
        x.predict.return_value = None
        l.predict.return_value = None
        t.predict.return_value = None
        pm.predict.return_value = None

        features = np.random.rand(12, 25).astype(np.float32)
        result = model.predict(features, features, _make_fake_request(100.0))

    assert result.predictions.horizon_30.y_hat == 100.0
    assert result.source == "baseline"

def test_ensemble_predict_confidence_between_0_and_1():
    model = EnsembleModel()
    model._loaded = True

    with patch("models.ensemble.baseline_model") as b, \
         patch("models.ensemble.xgboost_model") as x, \
         patch("models.ensemble.lstm_model") as l, \
         patch("models.ensemble.transformer_model") as t, \
         patch("models.personal_lstm.personal_lstm_manager") as pm:

        b.predict.return_value = _sub_pred(100.0)
        x.predict.return_value = _sub_pred(110.0)
        l.predict.return_value = None
        t.predict.return_value = None
        pm.predict.return_value = None

        features = np.random.rand(12, 25).astype(np.float32)
        result = model.predict(features, features, _make_fake_request(100.0))

    assert 0.0 <= result.confidence <= 1.0

def test_ensemble_predict_uses_personal_lstm_when_available():
    model = EnsembleModel()
    model._loaded = True

    with patch("models.ensemble.baseline_model") as b, \
         patch("models.ensemble.xgboost_model") as x, \
         patch("models.ensemble.lstm_model") as l, \
         patch("models.ensemble.transformer_model") as t, \
         patch("models.personal_lstm.personal_lstm_manager") as pm:

        b.predict.return_value = _sub_pred(100.0)
        x.predict.return_value = None
        pm.predict.return_value = _sub_pred(115.0)
        l.predict.return_value = None
        t.predict.return_value = None

        features = np.random.rand(12, 25).astype(np.float32)
        result = model.predict(features, features, _make_fake_request(100.0))

    # lstm global should NOT have been called
    l.predict.assert_not_called()
    assert result is not None
