# Glycopilot

## Technologies

- **Backend** : Django + Django REST Framework
- **Frontend** : React Native + Expo
- **Base de données** : MySQL 8.0
- **Containerisation** : Docker + Docker Compose

## Démarrage Local

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Démarrage avec Docker

### Méthode simple
```bash
./start.sh
```

### Méthode manuelle
```bash
docker compose up --build
```



## Accès

- **Backend API** : http://localhost:8006
- **Frontend** : http://localhost:8081 (Expo QR code)
- **Base de données** : localhost:3306

## Images Docker

- `glycopilot-backend` : API Django
- `mysql:8.0` : Base de données
- `node:18-alpine` : Frontend React Native

## Conteneurs

- `glycopilot-back` : Backend Django
- `glycopilot-db` : Base de données MySQL
- `glycopilot-front` : Frontend React Native