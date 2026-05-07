import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import numpy as np
import pytest
from unittest.mock import patch, MagicMock

from models.baseline import _risk, BaselineModel


# --- _risk ---

def test_risk_hypo_below_threshold():
    r = _risk(40.0, 70.0, "hypo", scale=30.0)
    assert r == 1.0

def test_risk_hypo_above_threshold():
    r = _risk(120.0, 70.0, "hypo", scale=30.0)
    assert r == 0.0

def test_risk_hyper_above_threshold():
    r = _risk(240.0, 180.0, "hyper", scale=30.0)
    assert r == 1.0  # clipped

def test_risk_hyper_below_threshold():
    r = _risk(100.0, 180.0, "hyper", scale=30.0)
    assert r == 0.0

def test_risk_clipped_between_0_and_1():
    assert _risk(-9999.0, 70.0, "hypo") == 1.0
    assert _risk(9999.0, 70.0, "hypo") == 0.0

def test_risk_returns_float():
    assert isinstance(_risk(100.0, 70.0, "hypo"), float)


# --- BaselineModel sans artefacts (mode persistence) ---

def test_baseline_not_loaded_by_default():
    model = BaselineModel()
    assert model.is_loaded() is False

def test_baseline_load_graceful_without_artifacts(tmp_path):
    model = BaselineModel()
    with patch("models.baseline.settings") as s:
        s.artifacts_dir = str(tmp_path)
        model.load()
    # _loaded=True mais tous les modèles None → is_loaded() False
    assert model._loaded is True
    assert model.is_loaded() is False

def test_baseline_predict_persistence_fallback(tmp_path):
    model = BaselineModel()
    with patch("models.baseline.settings") as s:
        s.artifacts_dir = str(tmp_path)
        model.load()

    features = np.full((12, 25), 120.0)
    result = model.predict(features)

    assert set(result.keys()) == {15, 30, 60}
    for h in [15, 30, 60]:
        # persistence: y_hat == current value (last row, first col)
        assert result[h]["y_hat"] == 120.0
        assert result[h]["p10"] == 120.0 - 15.0
        assert result[h]["p90"] == 120.0 + 15.0
        assert 0.0 <= result[h]["risk_hypo"] <= 1.0
        assert 0.0 <= result[h]["risk_hyper"] <= 1.0

def test_baseline_predict_with_mocked_lr_models(tmp_path):
    model = BaselineModel()
    with patch("models.baseline.settings") as s:
        s.artifacts_dir = str(tmp_path)
        model.load()

    # Inject mock LR models
    for h in [15, 30, 60]:
        lr = MagicMock()
        lr.predict.return_value = np.array([130.0])
        model._models[h] = lr

        q10 = MagicMock()
        q10.predict.return_value = np.array([110.0])
        model._q10[h] = q10

        q90 = MagicMock()
        q90.predict.return_value = np.array([150.0])
        model._q90[h] = q90

    features = np.random.rand(12, 25)
    result = model.predict(features)

    for h in [15, 30, 60]:
        assert result[h]["y_hat"] == 130.0
        assert result[h]["p10"] == 110.0
        assert result[h]["p90"] == 150.0

def test_baseline_predict_risk_for_hypo_value(tmp_path):
    model = BaselineModel()
    with patch("models.baseline.settings") as s:
        s.artifacts_dir = str(tmp_path)
        model.load()

    # Valeur hypoglycémique
    features = np.full((12, 25), 50.0)
    result = model.predict(features)

    assert result[30]["risk_hypo"] > 0.5
    assert result[30]["risk_hyper"] == 0.0
