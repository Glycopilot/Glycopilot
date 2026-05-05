import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from core.config import settings

_TOKEN = {"X-Internal-Token": settings.internal_token}


@pytest.fixture(scope="module")
def finetune_client():
    with patch("models.ensemble.ensemble_model", MagicMock()), \
         patch("core.scheduler.start_scheduler", return_value=None):
        from main import app
        with TestClient(app) as c:
            yield c


def test_finetune_missing_token_returns_401(finetune_client):
    resp = finetune_client.post("/finetune/patient-123", json={})
    assert resp.status_code == 401


def test_finetune_trigger_returns_started(finetune_client):
    with patch("api.routes.finetune._run_finetune"):
        resp = finetune_client.post(
            "/finetune/patient-xyz",
            json={"version": "v1.0", "epochs": 5, "device": "cpu"},
            headers=_TOKEN,
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "started"
    assert body["patient_id"] == "patient-xyz"


def test_finetune_status_no_model_returns_false(finetune_client):
    with patch("models.personal_lstm.PersonalLSTMManager.has_model", return_value=False):
        resp = finetune_client.get("/finetune/unknown-patient/status", headers=_TOKEN)
    assert resp.status_code == 200
    body = resp.json()
    assert body["has_personal_model"] is False
    assert body["patient_id"] == "unknown-patient"


def test_finetune_status_with_model_returns_true(finetune_client):
    with patch("models.personal_lstm.PersonalLSTMManager.has_model", return_value=True):
        resp = finetune_client.get("/finetune/known-patient/status", headers=_TOKEN)
    assert resp.status_code == 200
    body = resp.json()
    assert body["has_personal_model"] is True


def test_finetune_concurrent_same_patient_returns_409(finetune_client):
    from unittest.mock import MagicMock
    import api.routes.finetune as ft_module

    patient_id = "concurrent-patient-409"
    mock_lock = MagicMock()
    mock_lock.locked.return_value = True
    ft_module._finetune_locks[patient_id] = mock_lock

    try:
        resp = finetune_client.post(
            f"/finetune/{patient_id}",
            json={"version": "v1.0", "epochs": 5, "device": "cpu"},
            headers=_TOKEN,
        )
        assert resp.status_code == 409
    finally:
        del ft_module._finetune_locks[patient_id]
