import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from unittest.mock import patch, MagicMock


# --- _notify_django ---

def test_notify_django_skips_when_no_config():
    from core.scheduler import _notify_django
    mock_settings = MagicMock()
    mock_settings.django_url = None
    mock_settings.django_internal_token = None
    mock_req = MagicMock()
    with patch.dict("sys.modules", {"requests": mock_req}):
        _notify_django("p1", "v1.0", {}, mock_settings)
    mock_req.post.assert_not_called()


def test_notify_django_posts_correct_payload():
    from core.scheduler import _notify_django
    mock_settings = MagicMock()
    mock_settings.django_url = "http://django"
    mock_settings.django_internal_token = "tok"

    mock_req = MagicMock()
    metrics = {"mae_15": 1.0, "mae_30": 2.0, "mae_60": 3.0}
    with patch.dict("sys.modules", {"requests": mock_req}):
        _notify_django("p1", "v1.0", metrics, mock_settings)

    mock_req.post.assert_called_once()
    call_kwargs = mock_req.post.call_args
    payload = call_kwargs[1]["json"] if call_kwargs[1] else call_kwargs[0][1]
    assert payload["patient_id"] == "p1"
    assert payload["mae_30"] == 2.0


def test_notify_django_handles_exception_gracefully():
    from core.scheduler import _notify_django
    mock_settings = MagicMock()
    mock_settings.django_url = "http://django"
    mock_settings.django_internal_token = "tok"

    mock_req = MagicMock()
    mock_req.post.side_effect = Exception("timeout")
    with patch.dict("sys.modules", {"requests": mock_req}):
        _notify_django("p1", "v1.0", {}, mock_settings)  # ne doit pas lever


# --- start_scheduler ---

def test_start_scheduler_returns_none_when_apscheduler_missing():
    from core.scheduler import start_scheduler
    with patch.dict("sys.modules", {"apscheduler": None,
                                    "apscheduler.schedulers": None,
                                    "apscheduler.schedulers.background": None}):
        result = start_scheduler()
    assert result is None

def test_start_scheduler_returns_scheduler_when_apscheduler_available():
    # On vérifie juste que start_scheduler configure bien un job et démarre
    mock_scheduler = MagicMock()
    mock_bg_class = MagicMock(return_value=mock_scheduler)
    mock_bg_module = MagicMock()
    mock_bg_module.BackgroundScheduler = mock_bg_class

    with patch.dict("sys.modules", {
        "apscheduler": MagicMock(),
        "apscheduler.schedulers": MagicMock(),
        "apscheduler.schedulers.background": mock_bg_module,
    }):
        import importlib
        import core.scheduler as sched_mod
        importlib.reload(sched_mod)
        result = sched_mod.start_scheduler()

    assert mock_scheduler.add_job.called
    assert mock_scheduler.start.called
    assert result is mock_scheduler


# --- _finetune_all_patients ---
# requests est importé localement dans la fonction et absent du venv de test
# → on l'injecte via sys.modules

def _fake_requests(get_return=None, get_side_effect=None):
    """Retourne un module requests factice."""
    mock_req = MagicMock()
    if get_side_effect:
        mock_req.get.side_effect = get_side_effect
    else:
        mock_req.get.return_value = get_return
    return mock_req

def test_finetune_all_patients_skips_when_no_django_config():
    from core.scheduler import _finetune_all_patients
    mock_req = _fake_requests()
    with patch("core.config.settings") as s, \
         patch.dict("sys.modules", {"requests": mock_req}):
        s.django_url = None
        s.django_internal_token = None
        _finetune_all_patients()  # retourne avant d'appeler requests
    mock_req.get.assert_not_called()

def test_finetune_all_patients_handles_request_error():
    from core.scheduler import _finetune_all_patients
    mock_req = _fake_requests(get_side_effect=Exception("Connection refused"))
    with patch("core.config.settings") as s, \
         patch.dict("sys.modules", {"requests": mock_req}):
        s.django_url = "http://fake"
        s.django_internal_token = "fake-token"
        _finetune_all_patients()  # doit logger et retourner sans lever

def test_finetune_all_patients_skips_when_global_model_missing(tmp_path):
    from core.scheduler import _finetune_all_patients

    fake_response = MagicMock()
    fake_response.json.return_value = [{"id_user": "patient-1"}]
    fake_response.raise_for_status = MagicMock()

    mock_req = _fake_requests(get_return=fake_response)
    with patch("core.config.settings") as s, \
         patch.dict("sys.modules", {"requests": mock_req}):
        s.django_url = "http://fake"
        s.django_internal_token = "fake-token"
        s.artifacts_dir = str(tmp_path)
        s.model_version = "ensemble_v1.0"
        _finetune_all_patients()  # model file absent → log error et return

def test_finetune_all_patients_counts_success_skipped_failed(tmp_path):
    from core.scheduler import _finetune_all_patients

    model_dir = tmp_path / "lstm"
    model_dir.mkdir()
    (model_dir / "lstm_v1.0.pt").write_bytes(b"fake")

    patients = [{"id_user": "p1"}, {"id_user": "p2"}, {"id_user": "p3"}]
    fake_response = MagicMock()
    fake_response.json.return_value = patients
    fake_response.raise_for_status = MagicMock()

    def fake_load(patient_id, *a, **kw):
        return MagicMock()

    def fake_finetune(patient_id, **kw):
        if patient_id == "p2":
            raise ValueError("Données insuffisantes")
        if patient_id == "p3":
            raise RuntimeError("Erreur inattendue")

    mock_req = _fake_requests(get_return=fake_response)
    with patch("core.config.settings") as s, \
         patch.dict("sys.modules", {"requests": mock_req}), \
         patch("training.finetune_patient.load_patient_data_from_api", side_effect=fake_load), \
         patch("training.finetune_patient.finetune", side_effect=fake_finetune), \
         patch("models.personal_lstm.personal_lstm_manager") as mgr:
        s.django_url = "http://fake"
        s.django_internal_token = "token"
        s.artifacts_dir = str(tmp_path)
        s.model_version = "ensemble_v1.0"

        _finetune_all_patients()

        # p1 → success (invalidate appelé), p2 → skipped, p3 → failed
        assert mgr.invalidate.call_count == 1
        mgr.invalidate.assert_called_with("p1")
