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


def test_finetune_pending_missing_token_returns_401(finetune_client):
    resp = finetune_client.get("/finetune/pending")
    assert resp.status_code == 401


def test_finetune_pending_returns_empty_when_no_dir(finetune_client):
    with patch.object(settings, "artifacts_dir", "/nonexistent/path"):
        resp = finetune_client.get("/finetune/pending", headers=_TOKEN)
    assert resp.status_code == 200
    assert resp.json() == {"pending": []}


def test_finetune_pending_returns_pending_models(finetune_client, tmp_path):
    import json
    patient_dir = tmp_path / "patients" / "p1"
    patient_dir.mkdir(parents=True)
    meta = {"patient_id": "p1", "version": "v1.0", "status": "pending"}
    (patient_dir / "meta_v1.0.json").write_text(json.dumps(meta))

    with patch.object(settings, "artifacts_dir", str(tmp_path)):
        resp = finetune_client.get("/finetune/pending", headers=_TOKEN)

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["pending"]) == 1
    assert body["pending"][0]["patient_id"] == "p1"


def test_finetune_pending_ignores_non_pending_models(finetune_client, tmp_path):
    import json
    patient_dir = tmp_path / "patients" / "p2"
    patient_dir.mkdir(parents=True)
    meta = {"patient_id": "p2", "status": "approved"}
    (patient_dir / "meta_v1.0.json").write_text(json.dumps(meta))

    with patch.object(settings, "artifacts_dir", str(tmp_path)):
        resp = finetune_client.get("/finetune/pending", headers=_TOKEN)

    assert resp.json() == {"pending": []}


def test_approve_model_missing_token_returns_401(finetune_client):
    resp = finetune_client.post("/finetune/patient-123/approve")
    assert resp.status_code == 401


def test_approve_model_success(finetune_client):
    with patch("api.routes.finetune.personal_lstm_manager") as mgr:
        mgr.set_status = MagicMock()
        resp = finetune_client.post("/finetune/patient-123/approve", headers=_TOKEN)
    assert resp.status_code == 200
    assert resp.json() == {"status": "approved", "patient_id": "patient-123"}
    mgr.set_status.assert_called_once_with("patient-123", "v1.0", "approved")


def test_approve_model_not_found_returns_404(finetune_client):
    with patch("api.routes.finetune.personal_lstm_manager") as mgr:
        mgr.set_status.side_effect = FileNotFoundError
        resp = finetune_client.post("/finetune/unknown-patient/approve", headers=_TOKEN)
    assert resp.status_code == 404


def test_reject_model_missing_token_returns_401(finetune_client):
    resp = finetune_client.post("/finetune/patient-123/reject")
    assert resp.status_code == 401


def test_reject_model_success(finetune_client):
    with patch("api.routes.finetune.personal_lstm_manager") as mgr:
        mgr.set_status = MagicMock()
        resp = finetune_client.post("/finetune/patient-123/reject", headers=_TOKEN)
    assert resp.status_code == 200
    assert resp.json() == {"status": "rejected", "patient_id": "patient-123"}
    mgr.set_status.assert_called_once_with("patient-123", "v1.0", "rejected")


def test_reject_model_not_found_returns_404(finetune_client):
    with patch("api.routes.finetune.personal_lstm_manager") as mgr:
        mgr.set_status.side_effect = FileNotFoundError
        resp = finetune_client.post("/finetune/unknown-patient/reject", headers=_TOKEN)
    assert resp.status_code == 404


def test_finetune_invalid_patient_id_returns_400(finetune_client):
    for bad_id in ["../../etc/passwd", "../evil", "p1/p2", "a" * 65]:
        resp = finetune_client.post(
            f"/finetune/{bad_id}",
            json={"version": "v1.0"},
            headers=_TOKEN,
        )
        assert resp.status_code in (400, 404), f"Expected 400 for patient_id={bad_id!r}, got {resp.status_code}"


def test_finetune_valid_uuid_patient_id_accepted(finetune_client):
    with patch("api.routes.finetune._run_finetune"):
        resp = finetune_client.post(
            "/finetune/550e8400-e29b-41d4-a716-446655440000",
            json={"version": "v1.0", "epochs": 5, "device": "cpu"},
            headers=_TOKEN,
        )
    assert resp.status_code == 200


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
