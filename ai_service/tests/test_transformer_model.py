import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import math
import numpy as np
import pytest
from unittest.mock import patch

from models.transformer import _risk_sigmoid, TransformerModel, N_FEATURES, D_MODEL


# --- _risk_sigmoid ---

def test_risk_sigmoid_hypo_low_value():
    risk = _risk_sigmoid(40.0, 70.0, "hypo")
    assert risk > 0.85

def test_risk_sigmoid_hypo_high_value():
    risk = _risk_sigmoid(200.0, 70.0, "hypo")
    assert risk < 0.15

def test_risk_sigmoid_hyper_high_value():
    risk = _risk_sigmoid(260.0, 180.0, "hyper")
    assert risk > 0.85

def test_risk_sigmoid_hyper_low_value():
    risk = _risk_sigmoid(80.0, 180.0, "hyper")
    assert risk < 0.15

def test_risk_sigmoid_at_threshold_is_half():
    risk = _risk_sigmoid(180.0, 180.0, "hyper")
    assert abs(risk - 0.5) < 0.01


# --- TransformerModel sans artefact ---

def test_transformer_model_not_loaded_by_default():
    model = TransformerModel()
    assert model.is_loaded() is False

def test_transformer_predict_returns_none_when_not_loaded():
    model = TransformerModel()
    features = np.random.rand(12, N_FEATURES).astype(np.float32)
    assert model.predict(features) is None

def test_transformer_load_graceful_when_artifact_missing(tmp_path):
    model = TransformerModel()
    with patch("models.transformer.settings") as mock_settings:
        mock_settings.artifacts_dir = str(tmp_path)
        model.load()
    assert model.is_loaded() is False


# --- TransformerNet forward pass + PositionalEncoding (nécessite torch) ---

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

@pytest.mark.skipif(not TORCH_AVAILABLE, reason="PyTorch non installé")
def test_positional_encoding_output_shape():
    import torch
    from models.transformer import PositionalEncoding
    pe = PositionalEncoding(D_MODEL)
    x = torch.randn(2, 12, D_MODEL)
    out = pe(x)
    assert out.shape == x.shape

@pytest.mark.skipif(not TORCH_AVAILABLE, reason="PyTorch non installé")
def test_transformernet_forward_output_shapes():
    import torch
    from models.transformer import TransformerNet
    net = TransformerNet(n_features=N_FEATURES)
    x = torch.randn(2, 12, N_FEATURES)
    h15, h30, h60 = net(x)
    assert h15.shape == (2, 3)
    assert h30.shape == (2, 3)
    assert h60.shape == (2, 3)

@pytest.mark.skipif(not TORCH_AVAILABLE, reason="PyTorch non installé")
def test_transformer_predict_with_real_net():
    from models.transformer import TransformerNet

    net = TransformerNet(n_features=N_FEATURES)
    net.eval()

    model = TransformerModel()
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
        assert 0.0 <= result[h]["risk_hypo"] <= 1.0
        assert 0.0 <= result[h]["risk_hyper"] <= 1.0
