import logging
import sys
from datetime import timedelta
from pathlib import Path

from decouple import config, Csv

# --- BASE DIR ---
BASE_DIR = Path(__file__).resolve().parent.parent

# --- ENVIRONNEMENT ---
# "production" or "development"
ENV = config("Django_ENV", default="development")
DEBUG = config("DEBUG", default=False, cast=bool)

# Hosts autorisés (séparés par des virgules)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="127.0.0.1,localhost", cast=Csv())

# --- CLÉS SECRÈTES ---
SECRET_KEY = config("SECRET_KEY")
SECRET_KEY_ADMIN = config("SECRET_KEY_ADMIN", default="")

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
    "apps.glycemia",
    "apps.meals",
    "apps.activities",
    "apps.medications",
    "apps.alerts",
    "apps.notifications",
    "apps.dashboard",
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
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(asctime)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Log secure de la DB utilisée
if not "test" in sys.argv:
    logger.info(f"Running in {ENV.upper()} mode")
    logger.info(f"Database Engine: {DATABASES['default']['ENGINE']}")

# --- CORS ---
CORS_ALLOW_ALL_ORIGINS = DEBUG  # En dev uniquement
if not DEBUG:
    CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="", cast=Csv())

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


# EMAIL CONFIG
EMAIL_BACKEND = config("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = config("SMTP_HOST", default="")
EMAIL_PORT = config("SMTP_PORT", default=587, cast=int)
EMAIL_HOST_USER = config("SMTP_USERNAME", default="")
EMAIL_HOST_PASSWORD = config("SMTP_PASSWORD", default="")
EMAIL_USE_TLS = config("SMTP_USE_TLS", default=True, cast=bool)
EMAIL_USE_SSL = config("SMTP_USE_SSL", default=False, cast=bool)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default=EMAIL_HOST_USER)
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

if EMAIL_PORT == 465:
    EMAIL_USE_TLS = False
    EMAIL_USE_SSL = True


# --- INTERNATIONALIZATION ---
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True

# --- AWS S3 CONFIGURATION ---
AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="eu-west-3")

# Use S3 for media files in production AND if keys are present
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

# --- AUTH USER MODEL ---
AUTH_USER_MODEL = "users.AuthAccount"
