import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import numpy as np
import pytest
from unittest.mock import patch, MagicMock

from models.lstm import _risk_sigmoid, LSTMModel, N_FEATURES


# --- _risk_sigmoid ---

def test_risk_sigmoid_hypo_below_threshold():
    # y_hat well below hypo threshold → high risk
    risk = _risk_sigmoid(50.0, 70.0, "hypo")
    assert risk > 0.85

def test_risk_sigmoid_hypo_above_threshold():
    # y_hat well above hypo threshold → low risk
    risk = _risk_sigmoid(150.0, 70.0, "hypo")
    assert risk < 0.15

def test_risk_sigmoid_hyper_above_threshold():
    # y_hat well above hyper threshold → high risk
    risk = _risk_sigmoid(250.0, 180.0, "hyper")
    assert risk > 0.85

def test_risk_sigmoid_hyper_below_threshold():
    # y_hat well below hyper threshold → low risk
    risk = _risk_sigmoid(100.0, 180.0, "hyper")
    assert risk < 0.15

def test_risk_sigmoid_at_threshold_is_half():
    risk = _risk_sigmoid(70.0, 70.0, "hypo")
    assert abs(risk - 0.5) < 0.01

def test_risk_sigmoid_returns_float():
    assert isinstance(_risk_sigmoid(100.0, 70.0, "hypo"), float)


# --- LSTMModel sans artefact ---

def test_lstm_model_not_loaded_by_default():
    model = LSTMModel()
    assert model.is_loaded() is False

def test_lstm_predict_returns_none_when_not_loaded():
    model = LSTMModel()
    features = np.random.rand(12, N_FEATURES).astype(np.float32)
    assert model.predict(features) is None

def test_lstm_load_graceful_when_artifact_missing(tmp_path):
    model = LSTMModel()
    with patch("models.lstm.settings") as mock_settings:
        mock_settings.artifacts_dir = str(tmp_path)
        model.load()
    assert model.is_loaded() is False


# --- LSTMNet forward pass (nécessite torch) ---

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

@pytest.mark.skipif(not TORCH_AVAILABLE, reason="PyTorch non installé")
def test_lstmnet_forward_output_shapes():
    from models.lstm import LSTMNet
    import torch
    net = LSTMNet(n_features=N_FEATURES)
    x = torch.randn(2, 12, N_FEATURES)
    h15, h30, h60 = net(x)
    assert h15.shape == (2, 3)
    assert h30.shape == (2, 3)
    assert h60.shape == (2, 3)

@pytest.mark.skipif(not TORCH_AVAILABLE, reason="PyTorch non installé")
def test_lstm_predict_with_mocked_net():
    import torch
    from models.lstm import LSTMNet

    net = LSTMNet(n_features=N_FEATURES)
    net.eval()

    model = LSTMModel()
    model._net = net
    model._loaded = True

    features = np.random.rand(12, N_FEATURES).astype(np.float32)
    result = model.predict(features)

    assert result is not None
    assert set(result.keys()) == {15, 30, 60}
    for h in [15, 30, 60]:
        assert "y_hat" in result[h]
        assert "p10" in result[h]
        assert "p90" in result[h]
        assert "risk_hypo" in result[h]
        assert "risk_hyper" in result[h]
        assert 0.0 <= result[h]["risk_hypo"] <= 1.0
        assert 0.0 <= result[h]["risk_hyper"] <= 1.0
