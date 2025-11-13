import os
import sys
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv


# --- BASE DIR ---
BASE_DIR = Path(__file__).resolve().parent.parent

# Charger le .env
load_dotenv(os.path.join(BASE_DIR, '.env'))

# --- CLÉ SECRÈTE & DEBUG ---
SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-change-me")
DEBUG = os.environ.get("DEBUG", "True") == "True"
ALLOWED_HOSTS = ["*"]

# --- APPS INSTALLÉES ---
INSTALLED_APPS = [
    # Django core apps
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Packages tiers
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # Apps locales
    "apps.auth",
    "apps.users",
    "apps.profiles",
    "apps.doctors",
    "apps.contacts",
    "apps.glycemia",
    "apps.meals",
    "apps.activities",
    "apps.medications",
    "apps.alerts",
    "apps.notifications",
]


# --- MIDDLEWARE ---
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
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

# --- DATABASES ---
# Utilise SQLite pour les tests, MySQL en production
if "test" in sys.argv or "pytest" in sys.argv[0]:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.environ.get("DB_NAME"),
            "USER": os.environ.get("DB_USER"),
            "PASSWORD": os.environ.get("DB_PASSWORD"),
            "HOST": os.environ.get(
                "DB_HOST"
            ),
            "PORT": os.environ.get("DB_PORT"),
            "OPTIONS": {
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
        }
    }


# --- CORS ---
CORS_ALLOW_ALL_ORIGINS = True

# --- REST FRAMEWORK CONFIG ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

# --- JWT CONFIG ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
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

# --- INTERNATIONALIZATION ---
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True

# --- STATIC & MEDIA FILES ---
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- CUSTOM USER MODEL (⚠️ IMPORTANT pour ton app users) ---
AUTH_USER_MODEL = "users.User"
