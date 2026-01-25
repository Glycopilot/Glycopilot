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

# Configuration de l'environnement virtuel Python
echo ""
echo "🔧 Configuration de l'environnement Python..."

# Détecter la commande Python disponible
PYTHON_CMD=""
if command -v python3 > /dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python > /dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo "❌ Python n'est pas installé sur ce système"
    exit 1
fi

# Créer le venv s'il n'existe pas
if [ ! -d "backend/venv" ]; then
    echo "📦 Création de l'environnement virtuel Python..."
    cd backend
    $PYTHON_CMD -m venv venv
    echo "✅ Environnement virtuel créé"
    cd ..
fi

# Activer le venv et installer/mettre à jour les dépendances
echo "📦 Installation des dépendances Python dans le venv..."
cd backend

# Activer le venv (compatible multi-plateformes)
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
fi

# Installer les dépendances
pip install -q -r requirements.txt
echo "✅ Dépendances Python installées dans le venv"
cd ..

# Vérifier et installer les outils JavaScript
if ! command -v npm > /dev/null 2>&1; then
    echo "npm n'est pas installé sur ce système"
    echo " Installez Node.js pour continuer"
    exit 1
fi

if ! npm list eslint > /dev/null 2>&1; then
    echo "📦 Installation des outils JavaScript (ESLint, Prettier)..."
    cd frontend
    npm install > /dev/null 2>&1
    cd ..
    echo "✅ Outils JavaScript installés"
else
    echo "✅ Outils JavaScript déjà installés"
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

# Charger les variables dans l'environnement courant pour que Python les voit
set -a
source $ENV_FILE
set +a

# OVERRIDE DB_HOST for Host Execution
# Because the script runs on the host but the DB is in Docker (mapped to localhost:3306),
# we must use 127.0.0.1 instead of 'database'.
export DB_HOST=127.0.0.1

# Détection de l'environnement (Supporte Django_ENV et DJANGO_ENV)
CURRENT_ENV=""
if [ -n "$Django_ENV" ]; then
    CURRENT_ENV=$Django_ENV
elif [ -n "$DJANGO_ENV" ]; then
    CURRENT_ENV=$DJANGO_ENV
fi

# Normaliser en minuscule pour la comparaison
CURRENT_ENV=$(echo "$CURRENT_ENV" | tr '[:upper:]' '[:lower:]')

# IMPORTANT: On exporte la variable normalisée pour que Python (settings.py) la trouve
# car config('Django_ENV') est sensible à la casse sur Linux.
export Django_ENV=$CURRENT_ENV

echo "ℹ️  Environment détecté: $CURRENT_ENV"

if [ "$CURRENT_ENV" == "production" ]; then
    if [ "$2" == "--reset" ]; then
        echo "🚨 ATTENTION: MODE PRODUCTION + RESET FORCÉ DEMANDÉ 🚨"
        echo "⚠️  Cela va EFFACER toutes les données de la base de production !"
        echo "⏳ Vous avez 5 secondes pour annuler (Ctrl+C)..."
        sleep 5
        
        cd backend
        if [ -f "venv/bin/activate" ]; then
            source venv/bin/activate
        elif [ -f "venv/Scripts/activate" ]; then
            source venv/Scripts/activate
        fi
        
        # On force le reset en production
        python3 reset_db.py --force
        if [ $? -ne 0 ]; then
            echo "❌ Erreur lors du Reset DB Production"
            exit 1
        fi
        cd ..
        echo "✅ Base de Production Réinitialisée et Peuplée !"
    else
        echo "⚠️  MODE PRODUCTION DÉTECTÉ : Mise à jour SÉCURISÉE (Migrate + CollectStatic)"
        echo "   (Migrate + CollectStatic sans perte de données)"
        
        cd backend
        if [ -f "venv/bin/activate" ]; then
            source venv/bin/activate
        elif [ -f "venv/Scripts/activate" ]; then
            source venv/Scripts/activate
        fi

        # 1. Appliquer les migrations uniquement (PAS DE RESET)
        echo "🏗️  Application des migrations..."
        python3 manage.py migrate
        if [ $? -ne 0 ]; then
            echo "❌ Erreur lors des migrations"
            exit 1
        fi

        # 2. Collecter les fichiers statiques
        echo "🎨 Collection des fichiers statiques..."
        python3 manage.py collectstatic --noinput

        cd ..
        echo "✅ Mise à jour Production terminée avec succès !"
    fi
else
    echo "🔄 [DEV] Reset & Initialisation de la Base de Données..."
    
    # Assurer que la DB est démarrée
    echo "📦 Démarrage du conteneur de base de données..."
    if command -v docker > /dev/null 2>&1; then
        if docker compose version > /dev/null 2>&1; then
            docker compose up -d database
        elif docker-compose version > /dev/null 2>&1; then
            docker-compose up -d database
        fi
    fi
    
    # Attendre que la DB soit prête (simple sleep ou boucle)
    echo "⏳ Attente de la disponibilité de la DB (10s)..."
    sleep 10
    
    cd backend
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    elif [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
    fi
    
    python3 reset_db.py
    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors du Reset DB"
        exit 1
    fi
    cd ..
    echo "✅ Base de données réinitialisée et peuplée !"
fi
# Vérifier et configurer les Git hooks (une seule fois)
if [ ! -f ".git/hooks/pre-push" ]; then
    echo ""
    echo "🔧 Configuration des Git hooks (première fois)..."
    
    # Vérifier si on est dans un repo Git
    if [ -d ".git" ]; then
        # Le hook pre-push est déjà créé
        echo "✅ Git hooks configurés !"
        echo "   → Vérification automatique avant chaque push"
    else
        echo "⚠️  Pas de repository Git détecté"
    fi
else
    echo "✅ Git hooks déjà configurés"
fi

# Lancer le backend avec Docker et le frontend directement
echo ""
echo "🚀 Démarrage du backend avec Docker..."
echo ""

# Détecter la commande Docker Compose disponible
if command -v docker > /dev/null 2>&1; then
    if docker compose version > /dev/null 2>&1; then
        # Nouveau format: docker compose (en background)
        docker compose up -d --build
    elif docker-compose version > /dev/null 2>&1; then
        # Ancien format: docker-compose (en background)
        docker-compose up -d --build
    else
        echo "❌ Docker Compose n'est pas installé"
        echo "💡 Installez Docker Compose pour continuer"
        exit 1
    fi
else
    echo "❌ Docker n'est pas installé"
    echo "💡 Installez Docker pour continuer"
    exit 1
fi

# Attendre que le backend soit prêt
echo "⏳ Attente du backend (15 secondes)..."
sleep 15

# Frontend est déjà lancé par Docker Compose (voir docker-compose.yml)
echo ""
echo "✅ Glycopilot démarré !"
echo "Backend: http://localhost:8006"
echo "Frontend: http://localhost:8081"
echo ""
echo "📱 QR Code Frontend :"
docker logs glycopilot-front

echo ""
echo "🚀 Passage aux logs BACKEND (Emails, Requêtes API)..."
echo "   (Appuyez sur Ctrl+C pour quitter les logs, le serveur continuera de tourner)"
echo "----------------------------------------------------------------------------"
docker logs -f glycopilot-back
