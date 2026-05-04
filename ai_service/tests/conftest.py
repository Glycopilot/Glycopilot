import sys
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def _make_mock_ensemble():
    mock = MagicMock()
    mock.is_loaded.return_value = False
    mock.models_loaded.return_value = {
        "baseline": False,
        "xgboost": False,
        "lstm": False,
        "transformer": False,
        "ensemble": False,
    }
    mock.predict.side_effect = RuntimeError("Models not loaded in test environment")
    return mock


@pytest.fixture(scope="session")
def client():
    with patch("models.ensemble.ensemble_model", _make_mock_ensemble()), \
         patch("core.scheduler.start_scheduler", return_value=None):
        from main import app
        with TestClient(app) as c:
            yield c


@pytest.fixture
def minimal_predict_payload():
    return {
        "user_id": "test-user-123",
        "for_time": "2024-01-15T10:00:00Z",
        "readings": [
            {"measured_at": f"2024-01-15T0{i}:00:00Z", "value": 100.0 + i}
            for i in range(6)
        ],
    }
