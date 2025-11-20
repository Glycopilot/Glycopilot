FROM python:3.11-slim

# Installer les dépendances système nécessaires à MySQL + Django
RUN apt-get update && apt-get install -y \
    pkg-config \
    default-libmysqlclient-dev \
    gcc \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt


COPY . .

EXPOSE 8000

# Attendre la base MySQL avant de démarrer
CMD ["sh", "-c", "while ! nc -z database 3306; do sleep 1; done && python manage.py runserver 0.0.0.0:8000 --settings=core.settings"]
