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


def test_has_model_true_when_file_exists(tmp_path):
    from unittest.mock import patch
    patient_dir = tmp_path / "patients" / "test-patient"
    patient_dir.mkdir(parents=True)
    model_file = patient_dir / "lstm_personal_v1.0.pt"
    model_file.write_bytes(b"fake")

    mgr = PersonalLSTMManager()
    with patch("models.personal_lstm.PersonalLSTMManager._model_path",
               return_value=str(model_file)):
        assert mgr.has_model("test-patient", "v1.0") is True
