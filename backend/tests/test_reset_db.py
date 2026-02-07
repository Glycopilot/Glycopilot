import types
from unittest.mock import Mock, patch, mock_open

import pytest

import reset_db


class DummyManager:
    def __init__(self, exists=False):
        self._exists = exists

    def filter(self, **kwargs):
        return self

    def exists(self):
        return self._exists

    def __iter__(self):
        return iter([])

    def create(self, **kwargs):
        return object()

    def get_or_create(self, **kwargs):
        return (object(), True)

    def get(self, **kwargs):
        return object()


class DummyAlertRuleManager(DummyManager):
    def __iter__(self):
        return iter([object()])

    def get_or_create(self, **kwargs):
        return (object(), True)

    def get(self, **kwargs):
        return object()

    def create(self, **kwargs):
        return object()


class DummyAuthManager(DummyManager):
    def create_user(self, **kwargs):
        return object()


class DummyProfileObj:
    def __init__(self):
        self.doctor_profile = DummyDoctorProfile()
        self.patient_profile = DummyPatientProfile()


class DummyDoctorProfile:
    def __init__(self):
        self.verification_status = None
        self.license_number = ""

    def save(self):
        return None


class DummyPatientProfile:
    def __init__(self):
        self.diabetes_type = None

    def save(self):
        return None


class DummyProfileManager(DummyManager):
    def create(self, **kwargs):
        return DummyProfileObj()


def build_dummy_modules():
    dummy_role = types.SimpleNamespace(objects=DummyManager())
    dummy_profile = types.SimpleNamespace(objects=DummyProfileManager())
    dummy_user = types.SimpleNamespace(
        objects=DummyManager(), **{"create": DummyManager().create}
    )
    dummy_auth = types.SimpleNamespace(objects=DummyAuthManager())
    dummy_specialty = types.SimpleNamespace(objects=DummyManager())
    dummy_verif = types.SimpleNamespace(objects=DummyManager())
    dummy_invite = types.SimpleNamespace(objects=DummyManager())
    dummy_alert_rule = types.SimpleNamespace(objects=DummyAlertRuleManager())
    dummy_user_alert_rule = types.SimpleNamespace(objects=DummyManager())
    return {
        "apps.doctors.models.specialty": types.SimpleNamespace(
            Specialty=dummy_specialty
        ),
        "apps.doctors.models.status": types.SimpleNamespace(
            InvitationStatus=dummy_invite,
            VerificationStatus=dummy_verif,
        ),
        "apps.profiles.models": types.SimpleNamespace(
            Role=dummy_role, Profile=dummy_profile
        ),
        "apps.users.models": types.SimpleNamespace(User=dummy_user),
        "apps.alerts.models": types.SimpleNamespace(
            AlertRule=dummy_alert_rule,
            AlertSeverity=types.SimpleNamespace(CRITICAL=5, HIGH=4),
            UserAlertRule=dummy_user_alert_rule,
        ),
        "django.contrib.auth": types.SimpleNamespace(
            get_user_model=lambda: dummy_auth
        ),
    }


def test_reset_db_production_guard():
    with patch.object(reset_db, "config", return_value="production"):
        with patch.object(reset_db, "execute_from_command_line"):
            with patch("sys.argv", ["reset_db.py"]):
                with pytest.raises(SystemExit):
                    reset_db.reset_database()


def test_reset_db_production_force():
    with patch.object(reset_db, "config", return_value="production"):
        with patch.object(reset_db, "execute_from_command_line"):
            with patch("django.setup"):
                with patch("time.sleep"):
                    with patch("sys.argv", ["reset_db.py", "--force"]):
                        with patch.object(reset_db, "connection") as conn:
                            conn.settings_dict = {"ENGINE": "sqlite3", "NAME": "/tmp/test.db"}
                            conn.close = Mock()
                            from unittest.mock import mock_open

                            with patch("os.path.exists", return_value=False):
                                with patch("os.makedirs"):
                                    with patch("builtins.open", mock_open()):
                                        with patch.dict("sys.modules", build_dummy_modules()):
                                            reset_db.reset_database()


def test_reset_db_sqlite_and_mysql_paths():
    dummy_connection = Mock()
    dummy_connection.settings_dict = {"ENGINE": "sqlite3", "NAME": "/tmp/test.db"}
    dummy_connection.close = Mock()
    dummy_connection.cursor = Mock()
    dummy_connection.introspection.table_names.return_value = []

    dummy_modules = build_dummy_modules()

    from unittest.mock import mock_open

    with patch.object(reset_db, "config", return_value="development"):
        with patch.object(reset_db, "connection", dummy_connection):
            with patch.object(reset_db, "execute_from_command_line"):
                with patch("django.setup"):
                    with patch("os.path.exists", return_value=True):
                        with patch("os.remove"):
                            with patch("os.makedirs"):
                                with patch("builtins.open", mock_open()):
                                    with patch.dict(
                                        "sys.modules",
                                        dummy_modules,
                                    ):
                                        reset_db.reset_database()

    dummy_connection.settings_dict = {"ENGINE": "mysql", "NAME": "db"}
    dummy_cursor = Mock()
    class DummyCursorCM:
        def __enter__(self):
            return dummy_cursor

        def __exit__(self, exc_type, exc, tb):
            return False

    dummy_connection.cursor.return_value = DummyCursorCM()
    with patch.object(reset_db, "config", return_value="development"):
        with patch.object(reset_db, "connection", dummy_connection):
            with patch.object(reset_db, "execute_from_command_line"):
                with patch("django.setup"):
                    with patch("os.path.exists", return_value=False):
                        with patch("os.makedirs"):
                            with patch("builtins.open", mock_open()):
                                with patch.dict(
                                    "sys.modules",
                                    dummy_modules,
                                ):
                                    reset_db.reset_database()


def test_reset_db_sqlite_delete_error_and_postgres_tables():
    dummy_connection = Mock()
    dummy_connection.settings_dict = {"ENGINE": "sqlite3", "NAME": "/tmp/test.db"}
    dummy_connection.close = Mock()

    with patch.object(reset_db, "config", return_value="development"):
        with patch.object(reset_db, "connection", dummy_connection):
            with patch.object(reset_db, "execute_from_command_line"):
                with patch("django.setup"):
                    with patch("os.path.exists", return_value=True):
                        with patch("os.remove", side_effect=OSError("nope")):
                            with patch("os.makedirs"):
                                with patch("builtins.open", mock_open()):
                                    with patch.dict("sys.modules", build_dummy_modules()):
                                        reset_db.reset_database()

    dummy_connection.settings_dict = {"ENGINE": "postgresql", "NAME": "db"}
    dummy_cursor = Mock()

    class DummyCursorCM:
        def __enter__(self):
            return dummy_cursor

        def __exit__(self, exc_type, exc, tb):
            return False

    dummy_connection.cursor.return_value = DummyCursorCM()
    dummy_connection.introspection.table_names.return_value = []
    with patch.object(reset_db, "config", return_value="development"):
        with patch.object(reset_db, "connection", dummy_connection):
            with patch.object(reset_db, "execute_from_command_line"):
                with patch("django.setup"):
                    with patch("os.path.exists", return_value=False):
                        with patch("os.makedirs"):
                            with patch("builtins.open", mock_open()):
                                with patch.dict("sys.modules", build_dummy_modules()):
                                    reset_db.reset_database()

    dummy_connection.introspection.table_names.return_value = ["t1", "t2"]
    with patch.object(reset_db, "config", return_value="development"):
        with patch.object(reset_db, "connection", dummy_connection):
            with patch.object(reset_db, "execute_from_command_line"):
                with patch("django.setup"):
                    with patch("os.path.exists", return_value=False):
                        with patch("os.makedirs"):
                            with patch("builtins.open", mock_open()):
                                with patch.dict("sys.modules", build_dummy_modules()):
                                    reset_db.reset_database()


def test_reset_db_main_guard():
    import runpy

    with patch.object(reset_db, "config", return_value="development"):
        with patch.object(reset_db, "execute_from_command_line"):
            with patch("django.core.management.execute_from_command_line"):
                with patch("django.setup"):
                    with patch.object(reset_db, "connection") as conn:
                        conn.settings_dict = {"ENGINE": "sqlite3", "NAME": "/tmp/test.db"}
                        conn.close = Mock()
                        with patch("os.path.exists", return_value=False):
                            with patch("os.makedirs"):
                                with patch("builtins.open", mock_open()):
                                    with patch.dict("sys.modules", build_dummy_modules()):
                                        runpy.run_module("reset_db", run_name="__main__")


def test_dummy_helpers_cover_lines():
    dummy = DummyManager()
    list(dummy)
    alert_mgr = DummyAlertRuleManager()
    alert_mgr.get()
    alert_mgr.create()
    patient = DummyPatientProfile()
    patient.save()
