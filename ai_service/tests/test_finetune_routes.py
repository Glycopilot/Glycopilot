import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from unittest.mock import patch, MagicMock
import httpx
import pytest
import pytest_asyncio
from fastapi import BackgroundTasks

from core.config import settings

_TOKEN = {"X-Internal-Token": settings.internal_token}


@pytest_asyncio.fixture
async def finetune_client():
    with patch("models.ensemble.ensemble_model", MagicMock()), \
         patch("core.scheduler.start_scheduler", return_value=None):
        from main import app
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.mark.asyncio
async def test_finetune_missing_token_returns_401(finetune_client):
    resp = await finetune_client.post("/finetune/patient-123", json={})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_finetune_trigger_returns_started(finetune_client):
    import api.routes.finetune as ft_module
    from api.routes.finetune import FinetuneRequest, trigger_finetune

    tasks = BackgroundTasks()
    try:
        with patch.object(tasks, "add_task") as add_task:
            body = await trigger_finetune(
                "patient-xyz",
                FinetuneRequest(version="v1.0", epochs=5, device="cpu"),
                tasks,
                x_internal_token=settings.internal_token,
            )
    finally:
        ft_module._finetune_locks.pop("patient-xyz", None)

    add_task.assert_called_once()
    assert body["status"] == "started"
    assert body["patient_id"] == "patient-xyz"


@pytest.mark.asyncio
async def test_finetune_status_no_model_returns_false(finetune_client):
    with patch("models.personal_lstm.PersonalLSTMManager.has_model", return_value=False):
        resp = await finetune_client.get("/finetune/unknown-patient/status", headers=_TOKEN)
    assert resp.status_code == 200
    body = resp.json()
    assert body["has_personal_model"] is False
    assert body["patient_id"] == "unknown-patient"


@pytest.mark.asyncio
async def test_finetune_status_with_model_returns_true(finetune_client):
    with patch("models.personal_lstm.PersonalLSTMManager.has_model", return_value=True):
        resp = await finetune_client.get("/finetune/known-patient/status", headers=_TOKEN)
    assert resp.status_code == 200
    body = resp.json()
    assert body["has_personal_model"] is True


@pytest.mark.asyncio
async def test_finetune_pending_missing_token_returns_401(finetune_client):
    resp = await finetune_client.get("/finetune/pending")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_finetune_pending_returns_empty_when_no_dir(finetune_client):
    with patch.object(settings, "artifacts_dir", "/nonexistent/path"):
        resp = await finetune_client.get("/finetune/pending", headers=_TOKEN)
    assert resp.status_code == 200
    assert resp.json() == {"pending": []}


@pytest.mark.asyncio
async def test_finetune_pending_returns_pending_models(finetune_client, tmp_path):
    import json
    patient_dir = tmp_path / "patients" / "p1"
    patient_dir.mkdir(parents=True)
    meta = {"patient_id": "p1", "version": "v1.0", "status": "pending"}
    (patient_dir / "meta_v1.0.json").write_text(json.dumps(meta))

    with patch.object(settings, "artifacts_dir", str(tmp_path)):
        resp = await finetune_client.get("/finetune/pending", headers=_TOKEN)

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["pending"]) == 1
    assert body["pending"][0]["patient_id"] == "p1"


@pytest.mark.asyncio
async def test_finetune_pending_ignores_non_pending_models(finetune_client, tmp_path):
    import json
    patient_dir = tmp_path / "patients" / "p2"
    patient_dir.mkdir(parents=True)
    meta = {"patient_id": "p2", "status": "approved"}
    (patient_dir / "meta_v1.0.json").write_text(json.dumps(meta))

    with patch.object(settings, "artifacts_dir", str(tmp_path)):
        resp = await finetune_client.get("/finetune/pending", headers=_TOKEN)

    assert resp.json() == {"pending": []}


@pytest.mark.asyncio
async def test_approve_model_missing_token_returns_401(finetune_client):
    resp = await finetune_client.post("/finetune/patient-123/approve")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_approve_model_success(finetune_client):
    with patch("api.routes.finetune.personal_lstm_manager") as mgr:
        mgr.set_status = MagicMock()
        resp = await finetune_client.post("/finetune/patient-123/approve", headers=_TOKEN)
    assert resp.status_code == 200
    assert resp.json() == {"status": "approved", "patient_id": "patient-123"}
    mgr.set_status.assert_called_once_with("patient-123", "v1.0", "approved")


@pytest.mark.asyncio
async def test_approve_model_not_found_returns_404(finetune_client):
    with patch("api.routes.finetune.personal_lstm_manager") as mgr:
        mgr.set_status.side_effect = FileNotFoundError
        resp = await finetune_client.post("/finetune/unknown-patient/approve", headers=_TOKEN)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_reject_model_missing_token_returns_401(finetune_client):
    resp = await finetune_client.post("/finetune/patient-123/reject")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_reject_model_success(finetune_client):
    with patch("api.routes.finetune.personal_lstm_manager") as mgr:
        mgr.set_status = MagicMock()
        resp = await finetune_client.post("/finetune/patient-123/reject", headers=_TOKEN)
    assert resp.status_code == 200
    assert resp.json() == {"status": "rejected", "patient_id": "patient-123"}
    mgr.set_status.assert_called_once_with("patient-123", "v1.0", "rejected")


@pytest.mark.asyncio
async def test_reject_model_not_found_returns_404(finetune_client):
    with patch("api.routes.finetune.personal_lstm_manager") as mgr:
        mgr.set_status.side_effect = FileNotFoundError
        resp = await finetune_client.post("/finetune/unknown-patient/reject", headers=_TOKEN)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_finetune_invalid_patient_id_returns_400(finetune_client):
    for bad_id in ["../../etc/passwd", "../evil", "p1/p2", "a" * 65]:
        resp = await finetune_client.post(
            f"/finetune/{bad_id}",
            json={"version": "v1.0"},
            headers=_TOKEN,
        )
        assert resp.status_code in (400, 404), f"Expected 400 for patient_id={bad_id!r}, got {resp.status_code}"


@pytest.mark.asyncio
async def test_finetune_valid_uuid_patient_id_accepted(finetune_client):
    import api.routes.finetune as ft_module
    from api.routes.finetune import FinetuneRequest, trigger_finetune

    tasks = BackgroundTasks()
    patient_id = "550e8400-e29b-41d4-a716-446655440000"
    try:
        with patch.object(tasks, "add_task"):
            body = await trigger_finetune(
                patient_id,
                FinetuneRequest(version="v1.0", epochs=5, device="cpu"),
                tasks,
                x_internal_token=settings.internal_token,
            )
    finally:
        ft_module._finetune_locks.pop(patient_id, None)

    assert body["status"] == "started"


@pytest.mark.asyncio
async def test_finetune_concurrent_same_patient_returns_409(finetune_client):
    from unittest.mock import MagicMock
    import api.routes.finetune as ft_module

    patient_id = "concurrent-patient-409"
    mock_lock = MagicMock()
    mock_lock.locked.return_value = True
    ft_module._finetune_locks[patient_id] = mock_lock

    try:
        resp = await finetune_client.post(
            f"/finetune/{patient_id}",
            json={"version": "v1.0", "epochs": 5, "device": "cpu"},
            headers=_TOKEN,
        )
        assert resp.status_code == 409
    finally:
        del ft_module._finetune_locks[patient_id]
