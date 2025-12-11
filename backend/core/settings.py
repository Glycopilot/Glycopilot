import logging
import os
import sys
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

# --- BASE DIR ---
BASE_DIR = Path(__file__).resolve().parent.parent

# --- ENVIRONNEMENT ---
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# --- CLÉS SECRÈTES ---
SECRET_KEY = config("SECRET_KEY")
SECRET_KEY_ADMIN = config("SECRET_KEY_ADMIN", default=SECRET_KEY)

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
    "storages",  # django-storages pour S3
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
            "NAME": config("DB_NAME"),
            "USER": config("DB_USER"),
            "PASSWORD": config("DB_PASSWORD"),
            "HOST": config("DB_HOST"),
            "PORT": config("DB_PORT", default=3306, cast=int),
            "OPTIONS": {
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
                "charset": "utf8mb4",
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
EMAIL_HOST = config("SMTP_HOST", default="")
EMAIL_PORT = config("SMTP_PORT", default=587, cast=int)
EMAIL_HOST_USER = config("SMTP_USERNAME", default="")
EMAIL_HOST_PASSWORD = config("SMTP_PASSWORD", default="")
EMAIL_USE_TLS = config("SMTP_USE_TLS", default=True, cast=bool)
EMAIL_USE_SSL = False
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

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

# --- AWS S3 CONFIGURATION ---
USE_S3 = config("USE_S3", default=False, cast=bool)

if USE_S3:
    # AWS Credentials
    AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="eu-west-3")
    AWS_S3_CUSTOM_DOMAIN = config("AWS_S3_CUSTOM_DOMAIN")  # CloudFront domain

    # S3 Settings
    AWS_S3_OBJECT_PARAMETERS = {
        "CacheControl": "max-age=86400",  # 24 hours
    }
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False

    # Static files (CSS, JavaScript, Images)
    STATICFILES_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    STATIC_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/static/"

    # Media files (User uploads)
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"
else:
    # Local storage (Development)
    STATIC_URL = "/static/"
    STATIC_ROOT = BASE_DIR / "static"
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

# --- AUTH USER MODEL ---
AUTH_USER_MODEL = "users.User"
