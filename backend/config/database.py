# Database configuration
import os

# Configuration de la base de données
DATABASE_CONFIG = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'glycopilot_db'),
        'USER': os.environ.get('DB_USER', 'glycopilot_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'glycopilot_password'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# Configuration pour les tests
TEST_DATABASE_CONFIG = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
