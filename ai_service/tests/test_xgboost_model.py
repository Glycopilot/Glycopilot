import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import numpy as np
import pytest
from unittest.mock import patch, MagicMock

from models.xgboost_model import _risk, XGBoostModel, HORIZONS


# --- _risk ---

def test_risk_hypo_below_threshold():
    r = _risk(30.0, 70.0, "hypo", scale=25.0)
    assert r == 1.0

def test_risk_hypo_above_threshold():
    r = _risk(150.0, 70.0, "hypo", scale=25.0)
    assert r == 0.0

def test_risk_hyper_above_threshold():
    r = _risk(280.0, 180.0, "hyper", scale=25.0)
    assert r == 1.0

def test_risk_hyper_below_threshold():
    r = _risk(80.0, 180.0, "hyper", scale=25.0)
    assert r == 0.0

def test_risk_clipped_between_0_and_1():
    assert _risk(-9999.0, 70.0, "hypo") == 1.0
    assert _risk(9999.0, 70.0, "hypo") == 0.0

def test_risk_returns_float():
    assert isinstance(_risk(100.0, 70.0, "hypo"), float)


# --- XGBoostModel sans artefacts ---

def test_xgboost_not_loaded_by_default():
    model = XGBoostModel()
    assert model.is_loaded() is False

def test_xgboost_predict_returns_none_when_not_loaded():
    model = XGBoostModel()
    features = np.random.rand(12, 25)
    assert model.predict(features) is None

def test_xgboost_load_graceful_without_artifacts(tmp_path):
    model = XGBoostModel()
    with patch("models.xgboost_model.settings") as s:
        s.artifacts_dir = str(tmp_path)
        model.load()
    assert model.is_loaded() is False


# --- XGBoostModel avec modèles mockés ---

def _make_model_with_mocks():
    model = XGBoostModel()
    for h in HORIZONS:
        m = MagicMock()
        m.predict.return_value = np.array([120.0])
        model._models[h] = m

        q10 = MagicMock()
        q10.predict.return_value = np.array([100.0])
        model._q10_models[h] = q10

        q90 = MagicMock()
        q90.predict.return_value = np.array([140.0])
        model._q90_models[h] = q90

    model._loaded = True
    return model

def test_xgboost_predict_returns_all_horizons():
    model = _make_model_with_mocks()
    features = np.random.rand(12, 25)
    result = model.predict(features)

    assert result is not None
    assert set(result.keys()) == {15, 30, 60}

def test_xgboost_predict_correct_values():
    model = _make_model_with_mocks()
    features = np.random.rand(12, 25)
    result = model.predict(features)

    for h in HORIZONS:
        assert result[h]["y_hat"] == 120.0
        assert result[h]["p10"] == 100.0
        assert result[h]["p90"] == 140.0

def test_xgboost_predict_risk_bounds():
    model = _make_model_with_mocks()
    features = np.random.rand(12, 25)
    result = model.predict(features)

    for h in HORIZONS:
        assert 0.0 <= result[h]["risk_hypo"] <= 1.0
        assert 0.0 <= result[h]["risk_hyper"] <= 1.0

def test_xgboost_predict_fallback_p10_p90_when_no_quantile_models():
    model = XGBoostModel()
    for h in HORIZONS:
        m = MagicMock()
        m.predict.return_value = np.array([100.0])
        model._models[h] = m
    model._loaded = True

    features = np.random.rand(12, 25)
    result = model.predict(features)

    for h in HORIZONS:
        assert result[h]["p10"] == 100.0 - 12.0
        assert result[h]["p90"] == 100.0 + 12.0

def test_xgboost_predict_uses_last_timestep_only():
    model = _make_model_with_mocks()
    features = np.zeros((12, 25))
    features[-1] = 1.0  # unique last row

    model.predict(features)

    for h in HORIZONS:
        call_args = model._models[h].predict.call_args[0][0]
        assert call_args.shape == (1, 25)
        assert np.all(call_args == 1.0)
