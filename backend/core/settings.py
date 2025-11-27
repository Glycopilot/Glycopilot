import os
import sys
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
import logging

# --- BASE DIR ---
BASE_DIR = Path(__file__).resolve().parent.parent

# Charger le .env
load_dotenv(os.path.join(BASE_DIR, '.env'))

# --- ENVIRONNEMENT ---
ENV = os.environ.get("Django_ENV")
DEBUG = ENV == "development"
ALLOWED_HOSTS = ["*"] if DEBUG else ["localhost"]

# --- CLÉS SECRÈTES ---
SECRET_KEY = os.environ.get("SECRET_KEY")
SECRET_KEY_ADMIN = os.environ.get("SECRET_KEY_ADMIN")

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
    "django_rest_passwordreset",
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
            "HOST": os.environ.get("DB_HOST"),
            "PORT": os.environ.get("DB_PORT"),
            "OPTIONS": {
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
        }
    }

# --- LOGGING ---
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(asctime)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# --- Log de la configuration DB (mot de passe masqué) ---
dataconfig_safe = DATABASES["default"].copy()
dataconfig_safe["PASSWORD"] = "==========***hidden***========"
logger.info(f"Database configuration: {dataconfig_safe}")

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

ACCESS_TOKEN_LIFETIME = timedelta(
    minutes=int(os.environ.get("ACCESS_TOKEN_MINUTES", 60))
)
REFRESH_TOKEN_LIFETIME = timedelta(
    days=int(os.environ.get("REFRESH_TOKEN_DAYS", 7))
)

# --- JWT CONFIG ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": ACCESS_TOKEN_LIFETIME,
    "REFRESH_TOKEN_LIFETIME": REFRESH_TOKEN_LIFETIME,
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "SIGNING_KEY": SECRET_KEY,
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


# EMAIL CONFIG
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("SMTP_HOST")
EMAIL_PORT = int(os.getenv("SMTP_PORT"))
EMAIL_HOST_USER = os.getenv("SMTP_USERNAME")
EMAIL_HOST_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAIL_USE_TLS = os.getenv("SMTP_USE_TLS") == "true"
EMAIL_USE_SSL = False
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Choisis selon ton port
if EMAIL_PORT == 465:
    EMAIL_USE_TLS = False
    EMAIL_USE_SSL = True
else:
    EMAIL_USE_TLS = True
    EMAIL_USE_SSL = False


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

# --- AUTH USER MODEL ---
AUTH_USER_MODEL = "users.User"
