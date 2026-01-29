FROM python:3.11-slim

# Installer les dépendances système nécessaires à MySQL + Django
RUN apt-get update && apt-get install -y \
    pkg-config \
    default-libmysqlclient-dev \
    default-mysql-client \
    gcc \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt


COPY . .

# Rendre le script entrypoint exécutable
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

# Utiliser le script entrypoint qui gère les migrations intelligemment
CMD ["bash", "/app/entrypoint.sh"]
