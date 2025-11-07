import os
from pathlib import Path

# --- BASE DIR ---
BASE_DIR = Path(__file__).resolve().parent.parent

# --- CLÉ SECRÈTE & DEBUG ---
SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-change-me")
DEBUG = os.environ.get("DEBUG", "True") == "True"
ALLOWED_HOSTS = ["*"]

# --- APPS INSTALLÉES ---
INSTALLED_APPS = [
    # Django core apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Packages tiers
    "rest_framework",
    "corsheaders",

    # Apps locales
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
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# --- URL ROOT ---
ROOT_URLCONF = "core.urls"

# --- DATABASES ---
# --- DATABASES ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ.get("DB_NAME", "glycopilot_db"),
        "USER": os.environ.get("DB_USER", "glycopilot_user"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "glycopilot_password"),
        "HOST": os.environ.get("DB_HOST", "glycopilot-db"),  # nom du service MySQL dans docker-compose
        "PORT": os.environ.get("DB_PORT", "3306"),
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
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
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

