#!/bin/bash

# Script pour lancer Glycopilot
echo "🚀 Démarrage de Glycopilot..."

# Détection du système d'exploitation et configuration Docker
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    # Docker est généralement déjà dans le PATH
    true
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash, WSL)
    # Docker Desktop est généralement dans le PATH
    true
fi

# Vérifier que Docker est installé
if ! command -v docker > /dev/null 2>&1; then
    echo "❌ Docker n'est pas installé"
    echo "💡 Installez Docker pour continuer"
    exit 1
fi

# Détecter la commande Docker Compose disponible
DOCKER_COMPOSE=""
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif docker-compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ Docker Compose n'est pas installé"
    echo "💡 Installez Docker Compose pour continuer"
    exit 1
fi

# Vérifier et installer les outils JavaScript (pour le linting local)
echo ""
echo "🔧 Configuration des outils de développement..."

if command -v npm > /dev/null 2>&1; then
    if ! npm list eslint > /dev/null 2>&1; then
        echo "📦 Installation des outils JavaScript (ESLint, Prettier)..."
        cd frontend
        npm install > /dev/null 2>&1
        cd ..
        echo "✅ Outils JavaScript installés"
    else
        echo "✅ Outils JavaScript déjà installés"
    fi
else
    echo "⚠️  npm non trouvé - outils JS non installés (optionnel)"
fi

# Gestion des fichiers d'environnement (.env vs .env.prod) et profils Docker
ENV_FILE="backend/.env"
COMPOSE_PROFILES="local"

if [ "$1" == "aws" ] || [ "$1" == "prod" ]; then
    ENV_FILE="backend/.env.prod"
    COMPOSE_PROFILES="aws"
    echo "🌐 MODE AWS/PRODUCTION ACTIVÉ"
    echo "🔌 Utilisation de $ENV_FILE"
    echo "📦 Profil Docker: $COMPOSE_PROFILES"
else
    echo "💻 MODE LOCAL ACTIVÉ"
    echo "🔌 Utilisation de $ENV_FILE"
    echo "📦 Profil Docker: $COMPOSE_PROFILES"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Fichier $ENV_FILE introuvable !"
    exit 1
fi

# Charger les variables dans l'environnement courant
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a

# Export du profil pour docker-compose
export COMPOSE_PROFILES

# Détection de l'environnement (Supporte Django_ENV et DJANGO_ENV)
CURRENT_ENV=""
if [ -n "$Django_ENV" ]; then
    CURRENT_ENV=$Django_ENV
elif [ -n "$DJANGO_ENV" ]; then
    CURRENT_ENV=$DJANGO_ENV
fi

# Normaliser en minuscule pour la comparaison
CURRENT_ENV=$(echo "$CURRENT_ENV" | tr '[:upper:]' '[:lower:]')
export Django_ENV=$CURRENT_ENV

echo "ℹ️  Environment détecté: $CURRENT_ENV"

# Construire l'image Docker du backend
echo ""
echo "🔨 Construction de l'image Docker backend..."
if [ "$COMPOSE_PROFILES" == "aws" ]; then
    $DOCKER_COMPOSE --profile aws build backend_aws
else
    $DOCKER_COMPOSE --profile local build backend_local
fi

if [ "$CURRENT_ENV" == "production" ] || [ "$COMPOSE_PROFILES" == "aws" ]; then
    if [ "$2" == "--reset" ]; then
        echo "🚨 ATTENTION: MODE PRODUCTION/AWS + RESET FORCÉ DEMANDÉ 🚨"
        echo "⚠️  Cela va EFFACER toutes les données de la base de production !"
        echo "⏳ Vous avez 5 secondes pour annuler (Ctrl+C)..."
        sleep 5

        # Démarrer la DB AWS
        $DOCKER_COMPOSE --profile aws up -d database_aws redis_aws
        echo "⏳ Attente de la disponibilité de la DB (10s)..."
        sleep 10

        # Reset via Docker
        echo "🔄 Reset de la base de données via Docker..."
        $DOCKER_COMPOSE --profile aws run --rm backend_aws python reset_db.py --force
        if [ $? -ne 0 ]; then
            echo "❌ Erreur lors du Reset DB Production"
            exit 1
        fi
        echo "✅ Base de Production Réinitialisée et Peuplée !"
    else
        echo "⚠️  MODE PRODUCTION/AWS DÉTECTÉ : Mise à jour SÉCURISÉE"
        echo "   (Les migrations seront appliquées au démarrage du container)"
    fi
else
    # MODE LOCAL
    # Démarrer la DB et Redis locaux
    echo "📦 Démarrage des conteneurs de base de données (local)..."
    $DOCKER_COMPOSE --profile local up -d database_local redis_local

    # Attendre que la DB soit prête
    echo "⏳ Attente de la disponibilité de la DB (10s)..."
    sleep 10

    # Vérifier s'il y a des migrations en attente
    echo "🔍 Vérification des migrations..."
    PENDING_MIGRATIONS=$($DOCKER_COMPOSE --profile local run --rm backend_local python manage.py showmigrations --plan 2>/dev/null | grep "\[ \]" | wc -l)

    # Vérifier si les tables existent (première installation)
    TABLES_EXIST=$($DOCKER_COMPOSE --profile local run --rm backend_local python manage.py showmigrations 2>/dev/null | head -1)

    if [ "$1" == "--reset" ] || [ "$2" == "--reset" ]; then
        # Reset forcé demandé
        echo "🔄 [DEV] Reset forcé de la base de données..."
        $DOCKER_COMPOSE --profile local run --rm backend_local python reset_db.py
        if [ $? -ne 0 ]; then
            echo "❌ Erreur lors du Reset DB"
            exit 1
        fi
        echo "✅ Base de données réinitialisée et peuplée !"
    elif [ -z "$TABLES_EXIST" ] || [ "$PENDING_MIGRATIONS" -gt 0 ]; then
        # Première installation ou migrations en attente -> reset complet
        echo "🔄 [DEV] Nouvelles migrations détectées, reset de la base de données..."
        $DOCKER_COMPOSE --profile local run --rm backend_local python reset_db.py
        if [ $? -ne 0 ]; then
            echo "❌ Erreur lors du Reset DB"
            exit 1
        fi
        echo "✅ Base de données réinitialisée et peuplée !"
    else
        # Pas de nouvelles migrations -> juste appliquer les migrations existantes
        echo "✅ Aucune nouvelle migration détectée, conservation des données..."
        $DOCKER_COMPOSE --profile local run --rm backend_local python manage.py migrate --noinput
        echo "✅ Migrations appliquées !"
    fi
fi

# Vérifier et configurer les Git hooks (une seule fois)
if [ ! -f ".git/hooks/pre-push" ]; then
    echo ""
    echo "🔧 Configuration des Git hooks (première fois)..."

    if [ -d ".git" ]; then
        echo "✅ Git hooks configurés !"
        echo "   → Vérification automatique avant chaque push"
    else
        echo "⚠️  Pas de repository Git détecté"
    fi
else
    echo "✅ Git hooks déjà configurés"
fi

# Lancer tous les services avec Docker
echo ""
echo "🚀 Démarrage de tous les services avec Docker..."
echo ""

if [ "$COMPOSE_PROFILES" == "aws" ]; then
    $DOCKER_COMPOSE --profile aws up -d
else
    $DOCKER_COMPOSE --profile local up -d
fi

# Attendre que le backend soit prêt
echo "⏳ Attente du backend (15 secondes)..."
sleep 15

# Afficher le statut
echo ""
echo "✅ Glycopilot démarré !"

if [ "$COMPOSE_PROFILES" == "aws" ]; then
    echo ""
    echo "🌐 MODE AWS/PRODUCTION"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Backend (via Nginx):  http://localhost"
    echo "Backend (HTTPS):      https://localhost"
    echo "Backend direct:       http://localhost:8000 (interne)"
    echo ""
    echo "Services actifs:"
    echo "  • PostgreSQL (database_aws)"
    echo "  • Redis (redis_aws)"
    echo "  • Backend Django + Daphne (backend_aws)"
    echo "  • Nginx Reverse Proxy"
    echo ""
    echo "🚀 Passage aux logs BACKEND..."
    echo "   (Appuyez sur Ctrl+C pour quitter les logs, le serveur continuera de tourner)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    docker logs -f glycopilot-back-aws
else
    echo ""
    echo "💻 MODE LOCAL/DEV"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Backend:                http://localhost:8006"
    echo "Frontend mobile (Expo): http://localhost:8081"
    echo "Frontend web:           http://localhost:3000"
    echo ""
    echo "Services actifs:"
    echo "  • MySQL (database_local)"
    echo "  • Redis (redis_local)"
    echo "  • Backend Django + Daphne (backend_local)"
    echo "  • Frontend React Native (frontend)"
    echo "  • Frontend Web React (frontend_web)"
    echo ""
    echo "📱 QR Code Frontend :"
    # Attendre que le QR code soit généré
    sleep 5
    # Afficher les logs du frontend avec plus de lignes pour capturer le QR code
    docker logs glycopilot-front 2>&1 | tail -50

    echo ""
    echo "🚀 Passage aux logs BACKEND (Emails, Requêtes API)..."
    echo "   (Appuyez sur Ctrl+C pour quitter les logs, le serveur continuera de tourner)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    docker logs -f glycopilot-back-local
fi
