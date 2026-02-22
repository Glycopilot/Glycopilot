import logging
import sys
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from decouple import Csv, config

# --- BASE DIR ---
BASE_DIR = Path(__file__).resolve().parent.parent

# --- ENVIRONNEMENT ---
# "production" or "development"
ENV = config("Django_ENV", default="development")
DEBUG = config("DEBUG", default=False, cast=bool)

# Hosts autorisés (séparés par des virgules)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="127.0.0.1,localhost", cast=Csv())

# --- CLÉS SECRÈTES ---
# En CI/tests : fallback pour que pytest puisse tourner (SECRET_KEY non définie).
# En production : SECRET_KEY doit être définie dans l'environnement.
SECRET_KEY = config("SECRET_KEY", default="")
if not SECRET_KEY.strip():
    if ENV == "production":
        raise ImproperlyConfigured(
            "SECRET_KEY must be set in production (environment variable)."
        )
    SECRET_KEY = "django-insecure-ci-tests-only-do-not-use-in-production-xxxxxxxxxx"
SECRET_KEY_ADMIN = config("SECRET_KEY_ADMIN", default="")

# --- APPS INSTALLÉES ---
INSTALLED_APPS = [
    # ASGI server (must be first for channels)
    "daphne",
    # Django core apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Packages tiers
    "channels",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # Apps locales
    "apps.auth",
    "apps.users",
    "apps.profiles",
    "apps.doctors",
    "apps.glycemia",
    "apps.meals",
    "apps.activities",
    "apps.medications",
    "apps.alerts",
    "apps.notifications",
    "apps.dashboard",
    "apps.devices",
    "django_rest_passwordreset",
]

# --- MIDDLEWARE ---
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "middleware.request_logging.RequestLoggingMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# --- URL ROOT ---
ROOT_URLCONF = "core.urls"
APPEND_SLASH = False
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- DATABASES ---
if "test" in sys.argv or "pytest" in sys.argv[0]:
    # Base de test en mémoire (rapide et isolée)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }
else:
    # Choix du moteur via .env (mysql, postgresql, sqlite)
    DB_ENGINE = config("DB_ENGINE", default="sqlite")

    if DB_ENGINE == "postgresql":
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": config("DB_NAME"),
                "USER": config("DB_USER"),
                "PASSWORD": config("DB_PASSWORD"),
                "HOST": config("DB_HOST"),
                "PORT": config("DB_PORT", default=5432, cast=int),
            }
        }
    elif DB_ENGINE == "mysql":
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.mysql",
                "NAME": config("DB_NAME"),
                "USER": config("DB_USER"),
                "PASSWORD": config("DB_PASSWORD"),
                "HOST": config("DB_HOST", "localhost"),
                "PORT": config("DB_PORT", default=3306, cast=int),
                "OPTIONS": {
                    "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
                },
            }
        }
    else:
        # Fallback SQLite pour dev local simple
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        }

# --- LOGGING ---
# Configuration Django standard : pas de PII, niveaux adaptés prod/dev
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {name}: {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {"level": "WARNING"},
        "django.request": {"level": "WARNING"},
        "django.security": {"level": "WARNING"},
        "apps": {"level": "INFO" if DEBUG else "WARNING"},
        "middleware.request": {"level": "INFO" if DEBUG else "WARNING"},
    },
}

# --- CORS ---
CORS_ALLOW_ALL_ORIGINS = DEBUG  # En dev uniquement
if not DEBUG:
    CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="", cast=Csv())

# --- REST FRAMEWORK CONFIG ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "utils.jwt_auth.JWTAuthenticationDualKey",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

ACCESS_TOKEN_LIFETIME = timedelta(
    minutes=config("ACCESS_TOKEN_MINUTES", default=60, cast=int)
)
REFRESH_TOKEN_LIFETIME = timedelta(
    days=config("REFRESH_TOKEN_DAYS", default=7, cast=int)
)

# --- JWT CONFIG ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": ACCESS_TOKEN_LIFETIME,
    "REFRESH_TOKEN_LIFETIME": REFRESH_TOKEN_LIFETIME,
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "SIGNING_KEY": SECRET_KEY,
    "USER_ID_FIELD": "id_auth",
}

# --- TEMPLATES ---
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# --- EMAIL / SMTP ---
# Configuration optionnelle : si SMTP_* non renseignés ou vides, backend console en dev.
# Ne jamais mettre de secrets en défaut ; valeur vide = config non fournie.


def _env(key: str, default: str = "") -> str:
    """Lit une variable d'environnement ; chaîne vide si absente ou non renseignée."""
    value = config(key, default=default)
    return (value or "").strip() if value is not None else ""


def _env_int(key: str, default: int, min_val: int = 1, max_val: int = 65535) -> int:
    """Lit un entier (ex. port) ; ignore les valeurs vides ou invalides."""
    raw = _env(key, str(default))
    if not raw:
        return default
    try:
        n = int(raw)
        return max(min_val, min(max_val, n))
    except (ValueError, TypeError):
        return default


def _env_bool(key: str, default: bool) -> bool:
    """Lit un booléen (true/1/yes vs false/0/no)."""
    raw = _env(key, "true" if default else "false").lower()
    if not raw:
        return default
    if raw in ("true", "1", "yes", "on"):
        return True
    if raw in ("false", "0", "no", "off"):
        return False
    return default


_smtp_host = _env("SMTP_HOST")
_smtp_user = _env("SMTP_USERNAME")
_smtp_pass = _env("SMTP_PASSWORD")
_smtp_configured = bool(_smtp_host and _smtp_user and _smtp_pass)

if _smtp_configured:
    EMAIL_BACKEND = config(
        "EMAIL_BACKEND",
        default="django.core.mail.backends.smtp.EmailBackend",
    )
else:
    EMAIL_BACKEND = (
        "django.core.mail.backends.console.EmailBackend"
        if DEBUG
        else "django.core.mail.backends.smtp.EmailBackend"
    )

EMAIL_HOST = _smtp_host or ""
EMAIL_PORT = _env_int("SMTP_PORT", 587)
EMAIL_HOST_USER = _smtp_user or ""
EMAIL_HOST_PASSWORD = _smtp_pass or ""
EMAIL_USE_TLS = _env_bool("SMTP_USE_TLS", True)
EMAIL_USE_SSL = _env_bool("SMTP_USE_SSL", False)

if EMAIL_PORT == 465:
    EMAIL_USE_TLS = False
    EMAIL_USE_SSL = True

DEFAULT_FROM_EMAIL = (
    _env("DEFAULT_FROM_EMAIL") or EMAIL_HOST_USER or "noreply@glycopilot.com"
)
FRONTEND_URL = _env("FRONTEND_URL") or "http://localhost:3000"


# --- INTERNATIONALIZATION ---
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True

# --- AWS S3 ---
# Secrets uniquement via variables d'environnement ; pas de valeur par défaut pour les clés.
AWS_ACCESS_KEY_ID = _env("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = _env("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = _env("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = _env("AWS_S3_REGION_NAME") or "eu-west-3"

if AWS_STORAGE_BUCKET_NAME and not DEBUG:
    AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"
    AWS_DEFAULT_ACL = "public-read"
    AWS_S3_OBJECT_PARAMETERS = {
        "CacheControl": "max-age=86400",
    }
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
else:
    # Place locale pour dev
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

# --- STATIC FILES ---
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
STATIC_ROOT.mkdir(parents=True, exist_ok=True)

# --- AUTH USER MODEL ---
AUTH_USER_MODEL = "users.AuthAccount"

# --- ASGI / CHANNELS ---
ASGI_APPLICATION = "core.asgi.application"
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                (
                    config("REDIS_HOST", default="redis"),
                    config("REDIS_PORT", default=6379, cast=int),
                )
            ],
        },
    },
}
