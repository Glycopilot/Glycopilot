import importlib.util
import os
import sys

import pytest
from django.core.exceptions import ImproperlyConfigured


SETTINGS_PATH = os.path.join(os.path.dirname(__file__), "..", "core", "settings.py")


def load_settings_with_env(env, argv):
    old_env = os.environ.copy()
    old_argv = sys.argv[:]
    os.environ.clear()
    os.environ.update(env)
    sys.argv = argv[:]
    try:
        spec = importlib.util.spec_from_file_location("settings_temp", SETTINGS_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        os.environ.clear()
        os.environ.update(old_env)
        sys.argv = old_argv


def test_settings_secret_key_required_in_production():
    env = {
        "Django_ENV": "production",
        "DEBUG": "false",
        "SECRET_KEY": "",
    }
    with pytest.raises(ImproperlyConfigured):
        load_settings_with_env(env, ["manage.py", "runserver"])


def test_settings_fallback_secret_key_in_dev():
    env = {
        "Django_ENV": "development",
        "DEBUG": "false",
        "SECRET_KEY": "",
    }
    module = load_settings_with_env(env, ["manage.py", "runserver"])
    assert module.SECRET_KEY


def test_settings_db_branches_and_smtp_aws():
    env = {
        "Django_ENV": "development",
        "DEBUG": "false",
        "SECRET_KEY": "x",
        "DB_ENGINE": "postgresql",
        "DB_NAME": "db",
        "DB_USER": "user",
        "DB_PASSWORD": "pass",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "SMTP_HOST": "smtp.example.com",
        "SMTP_USERNAME": "user",
        "SMTP_PASSWORD": "pass",
        "SMTP_PORT": "465",
        "SMTP_USE_TLS": "true",
        "SMTP_USE_SSL": "false",
        "DEFAULT_FROM_EMAIL": "noreply@example.com",
        "AWS_STORAGE_BUCKET_NAME": "bucket",
        "AWS_ACCESS_KEY_ID": "key",
        "AWS_SECRET_ACCESS_KEY": "secret",
        "AWS_S3_REGION_NAME": "us-east-1",
    }
    module = load_settings_with_env(env, ["manage.py", "runserver"])
    assert module.DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql"
    assert module.EMAIL_USE_SSL is True
    assert module.AWS_S3_CUSTOM_DOMAIN

    os.environ["SMTP_PORT"] = "not-an-int"
    assert module._env_int("SMTP_PORT", 587) == 587
    os.environ["SMTP_PORT"] = ""
    assert module._env_int("SMTP_PORT", 587) == 587
    os.environ["SOME_BOOL"] = "maybe"
    assert module._env_bool("SOME_BOOL", True) is True
    os.environ["SOME_BOOL"] = ""
    assert module._env_bool("SOME_BOOL", False) is False

    env["DB_ENGINE"] = "mysql"
    module = load_settings_with_env(env, ["manage.py", "runserver"])
    assert module.DATABASES["default"]["ENGINE"] == "django.db.backends.mysql"

    env["DB_ENGINE"] = "sqlite"
    module = load_settings_with_env(env, ["manage.py", "runserver"])
    assert module.DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3"

    env.pop("SMTP_HOST", None)
    env.pop("SMTP_USERNAME", None)
    env.pop("SMTP_PASSWORD", None)
    env["DEBUG"] = "false"
    module = load_settings_with_env(env, ["manage.py", "runserver"])
    assert module.EMAIL_BACKEND.endswith("smtp.EmailBackend")


def test_settings_email_backend_console_when_no_smtp():
    env = {
        "Django_ENV": "development",
        "DEBUG": "true",
        "SECRET_KEY": "x",
        "SMTP_HOST": "",
        "SMTP_USERNAME": "",
        "SMTP_PASSWORD": "",
    }
    module = load_settings_with_env(env, ["manage.py", "runserver"])
    assert module.EMAIL_BACKEND.endswith("console.EmailBackend")
