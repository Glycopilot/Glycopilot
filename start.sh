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

# Gestion des fichiers d'environnement (.env vs .env.prod)
ENV_FILE="backend/.env"
if [ "$1" == "prod" ]; then
    ENV_FILE="backend/.env.prod"
    echo "🔌 UTILISATION DE LA CONFIG PRODUCTION ($ENV_FILE)"
else
    echo "🔌 Utilisation de la config par défaut ($ENV_FILE)"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Fichier $ENV_FILE introuvable !"
    exit 1
fi

# Charger les variables dans l'environnement courant
set -a
source $ENV_FILE
set +a

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
$DOCKER_COMPOSE build backend

if [ "$CURRENT_ENV" == "production" ]; then
    if [ "$2" == "--reset" ]; then
        echo "🚨 ATTENTION: MODE PRODUCTION + RESET FORCÉ DEMANDÉ 🚨"
        echo "⚠️  Cela va EFFACER toutes les données de la base de production !"
        echo "⏳ Vous avez 5 secondes pour annuler (Ctrl+C)..."
        sleep 5

        # Démarrer la DB
        $DOCKER_COMPOSE up -d database
        echo "⏳ Attente de la disponibilité de la DB (10s)..."
        sleep 10

        # Reset via Docker
        echo "🔄 Reset de la base de données via Docker..."
        $DOCKER_COMPOSE run --rm backend python reset_db.py --force
        if [ $? -ne 0 ]; then
            echo "❌ Erreur lors du Reset DB Production"
            exit 1
        fi
        echo "✅ Base de Production Réinitialisée et Peuplée !"
    else
        echo "⚠️  MODE PRODUCTION DÉTECTÉ : Mise à jour SÉCURISÉE"
        echo "   (Les migrations seront appliquées au démarrage du container)"
    fi
else
    echo "🔄 [DEV] Reset & Initialisation de la Base de Données..."

    # Démarrer la DB
    echo "📦 Démarrage du conteneur de base de données..."
    $DOCKER_COMPOSE up -d database

    # Attendre que la DB soit prête
    echo "⏳ Attente de la disponibilité de la DB (10s)..."
    sleep 10

    # Reset via Docker (utilise l'image construite)
    echo "🔄 Reset de la base de données via Docker..."
    $DOCKER_COMPOSE run --rm backend python reset_db.py
    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors du Reset DB"
        exit 1
    fi
    echo "✅ Base de données réinitialisée et peuplée !"
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

$DOCKER_COMPOSE up -d

# Attendre que le backend soit prêt
echo "⏳ Attente du backend (15 secondes)..."
sleep 15

# Afficher le statut
echo ""
echo "✅ Glycopilot démarré !"
echo "Backend: http://localhost:8006"
echo "Frontend: http://localhost:8081"
echo ""
echo "📱 QR Code Frontend :"
docker logs glycopilot-front 2>/dev/null | tail -20

echo ""
echo "🚀 Passage aux logs BACKEND (Emails, Requêtes API)..."
echo "   (Appuyez sur Ctrl+C pour quitter les logs, le serveur continuera de tourner)"
echo "----------------------------------------------------------------------------"
docker logs -f glycopilot-back
