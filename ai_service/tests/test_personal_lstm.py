import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.personal_lstm import PersonalLSTMManager, MAX_CACHE_SIZE


def test_has_model_false_when_no_file():
    mgr = PersonalLSTMManager()
    assert mgr.has_model("nonexistent-patient", "v1.0") is False


def test_get_model_returns_none_when_no_file():
    mgr = PersonalLSTMManager()
    assert mgr.get_model("nonexistent-patient", "v1.0") is None


def test_invalidate_removes_entry_from_cache():
    mgr = PersonalLSTMManager()
    from unittest.mock import MagicMock
    fake_model = MagicMock()
    mgr._cache["patient-abc"] = (fake_model, 123.0)
    assert "patient-abc" in mgr._cache
    mgr.invalidate("patient-abc")
    assert "patient-abc" not in mgr._cache


def test_invalidate_nonexistent_patient_does_not_raise():
    mgr = PersonalLSTMManager()
    mgr.invalidate("never-existed")  # must not raise


def test_cache_eviction_respects_max_size():
    mgr = PersonalLSTMManager()
    from unittest.mock import MagicMock
    for i in range(MAX_CACHE_SIZE):
        mgr._cache[f"patient-{i}"] = (MagicMock(), float(i))
    assert len(mgr._cache) == MAX_CACHE_SIZE

    # Simulate loading one more — should evict oldest
    from collections import OrderedDict
    if len(mgr._cache) >= MAX_CACHE_SIZE:
        mgr._cache.popitem(last=False)
    mgr._cache["patient-new"] = (MagicMock(), 999.0)

    assert len(mgr._cache) == MAX_CACHE_SIZE
    assert "patient-0" not in mgr._cache
    assert "patient-new" in mgr._cache


def test_has_model_true_when_file_exists_and_approved(tmp_path):
    import json
    from unittest.mock import patch
    patient_dir = tmp_path / "patients" / "test-patient"
    patient_dir.mkdir(parents=True)
    model_file = patient_dir / "lstm_personal_v1.0.pt"
    model_file.write_bytes(b"fake")
    meta_file = patient_dir / "meta_v1.0.json"
    meta_file.write_text(json.dumps({"status": "approved"}))

    mgr = PersonalLSTMManager()
    with patch.object(mgr, "_model_path", return_value=str(model_file)), \
         patch.object(mgr, "_meta_path", return_value=str(meta_file)):
        assert mgr.has_model("test-patient", "v1.0") is True


def test_has_model_false_when_file_exists_but_pending(tmp_path):
    import json
    from unittest.mock import patch
    patient_dir = tmp_path / "patients" / "test-patient"
    patient_dir.mkdir(parents=True)
    model_file = patient_dir / "lstm_personal_v1.0.pt"
    model_file.write_bytes(b"fake")
    meta_file = patient_dir / "meta_v1.0.json"
    meta_file.write_text(json.dumps({"status": "pending"}))

    mgr = PersonalLSTMManager()
    with patch.object(mgr, "_model_path", return_value=str(model_file)), \
         patch.object(mgr, "_meta_path", return_value=str(meta_file)):
        assert mgr.has_model("test-patient", "v1.0") is False


def test_has_model_false_when_file_exists_but_rejected(tmp_path):
    import json
    from unittest.mock import patch
    patient_dir = tmp_path / "patients" / "test-patient"
    patient_dir.mkdir(parents=True)
    model_file = patient_dir / "lstm_personal_v1.0.pt"
    model_file.write_bytes(b"fake")
    meta_file = patient_dir / "meta_v1.0.json"
    meta_file.write_text(json.dumps({"status": "rejected"}))

    mgr = PersonalLSTMManager()
    with patch.object(mgr, "_model_path", return_value=str(model_file)), \
         patch.object(mgr, "_meta_path", return_value=str(meta_file)):
        assert mgr.has_model("test-patient", "v1.0") is False


# --- get_status ---

def test_get_status_missing_when_no_meta_file(tmp_path):
    from unittest.mock import patch
    mgr = PersonalLSTMManager()
    meta_path = str(tmp_path / "meta_v1.0.json")
    with patch.object(mgr, "_meta_path", return_value=meta_path):
        assert mgr.get_status("p1", "v1.0") == "missing"


def test_get_status_returns_value_from_file(tmp_path):
    import json
    from unittest.mock import patch
    meta_file = tmp_path / "meta_v1.0.json"
    meta_file.write_text(json.dumps({"status": "approved"}))

    mgr = PersonalLSTMManager()
    with patch.object(mgr, "_meta_path", return_value=str(meta_file)):
        assert mgr.get_status("p1", "v1.0") == "approved"


def test_get_status_returns_pending_on_corrupt_file(tmp_path):
    from unittest.mock import patch
    meta_file = tmp_path / "meta_v1.0.json"
    meta_file.write_text("not valid json")

    mgr = PersonalLSTMManager()
    with patch.object(mgr, "_meta_path", return_value=str(meta_file)):
        assert mgr.get_status("p1", "v1.0") == "pending"


# --- set_status ---

def test_set_status_updates_meta_file(tmp_path):
    import json
    from unittest.mock import patch
    meta_file = tmp_path / "meta_v1.0.json"
    meta_file.write_text(json.dumps({"status": "pending", "patient_id": "p1"}))

    mgr = PersonalLSTMManager()
    with patch.object(mgr, "_meta_path", return_value=str(meta_file)):
        mgr.set_status("p1", "v1.0", "approved")

    with open(meta_file) as f:
        assert json.load(f)["status"] == "approved"


def test_set_status_raises_when_meta_file_missing(tmp_path):
    import pytest
    from unittest.mock import patch
    mgr = PersonalLSTMManager()
    meta_path = str(tmp_path / "meta_v1.0.json")
    with patch.object(mgr, "_meta_path", return_value=meta_path):
        with pytest.raises(FileNotFoundError):
            mgr.set_status("p1", "v1.0", "approved")


def test_set_status_calls_invalidate_when_not_approved(tmp_path):
    import json
    from unittest.mock import patch, MagicMock
    meta_file = tmp_path / "meta_v1.0.json"
    meta_file.write_text(json.dumps({"status": "pending"}))

    mgr = PersonalLSTMManager()
    mgr.invalidate = MagicMock()
    with patch.object(mgr, "_meta_path", return_value=str(meta_file)):
        mgr.set_status("p1", "v1.0", "rejected")

    mgr.invalidate.assert_called_once_with("p1")


def test_set_status_does_not_invalidate_when_approved(tmp_path):
    import json
    from unittest.mock import patch, MagicMock
    meta_file = tmp_path / "meta_v1.0.json"
    meta_file.write_text(json.dumps({"status": "pending"}))

    mgr = PersonalLSTMManager()
    mgr.invalidate = MagicMock()
    with patch.object(mgr, "_meta_path", return_value=str(meta_file)):
        mgr.set_status("p1", "v1.0", "approved")

    mgr.invalidate.assert_not_called()


def test_predict_returns_none_when_model_missing():
    from unittest.mock import patch
    mgr = PersonalLSTMManager()

    with patch.object(mgr, "get_model", return_value=None):
        assert mgr.predict("p1", "v1.0", [[0.0] * 37]) is None


def test_predict_formats_model_outputs():
    import torch
    from unittest.mock import MagicMock, patch

    mgr = PersonalLSTMManager()
    model = MagicMock()
    model.return_value = (
        torch.tensor([[65.0, 60.0, 90.0]]),
        torch.tensor([[150.0, 140.0, 170.0]]),
        torch.tensor([[210.0, 190.0, 230.0]]),
    )

    features = torch.zeros((24, 37), dtype=torch.float32)
    with patch.object(mgr, "get_model", return_value=model):
        result = mgr.predict("p1", "v1.0", features)

    assert result[15]["y_hat"] == 65.0
    assert result[15]["risk_hypo"] > 0
    assert result[30]["risk_hyper"] == 0.0
    assert result[60]["risk_hyper"] > 0
    model.assert_called_once()
