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

#### Sur macOS/Linux :
```bash
./start.sh
```

#### Sur Windows :
```cmd
start.bat
```

### Méthode manuelle
```bash
docker compose up --build
```

### Prérequis
- **Docker** et **Docker Compose** installés
- **Python 3.x** installé
- **Node.js** et **npm** installés
- **Git** installé (pour les hooks de qualité)



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

## Qualité de Code

### Configuration automatique
Les outils de qualité sont **automatiquement configurés** lors du premier démarrage avec `./start.sh`. 

**✅ Vérification automatique :** Avant chaque commit et push, le code est vérifié automatiquement.

**⚠️ IMPORTANT :** Si le code ne respecte pas les standards, les opérations Git seront bloquées.

### Outils intégrés
- **Backend Python** : Black (formatage), Flake8 (style), isort (imports)
- **Frontend JavaScript** : Prettier (formatage), ESLint (style)
- **Git Hooks** : Vérification automatique avant commit/push

### Commandes manuelles (optionnelles)
```bash
# Vérifier la qualité
./scripts/lint_all.sh

# Corriger automatiquement
./scripts/fix_all.sh

# Tester les outils
./test_quality.sh
```

## Protection des secrets

- **Scan local** : installez `gitleaks` (`brew install gitleaks`) puis lancez `gitleaks detect --source . --redact` pour vérifier le dépôt complet.
- **Hook pre-commit** : Husky exécute automatiquement `gitleaks protect --staged --redact` avant chaque commit. L'opération échouera si un secret est détecté.
- **CI GitHub Actions** : le job `secret-scan` exécute `gitleaks detect` sur chaque push/PR. Le pipeline bloque si un secret est trouvé.
- **Faux positifs documentés** : les exemples contrôlés sont listés dans `.gitleaksignore`. Ajoutez les nouvelles exceptions si nécessaire.
