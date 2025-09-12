FROM python:3.11-slim

# Installer les dépendances système pour MySQL
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    pkg-config \
    gcc \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# Script de démarrage qui attend MySQL et lance les migrations
CMD ["sh", "-c", "while ! nc -z database 3306; do sleep 1; done && python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
