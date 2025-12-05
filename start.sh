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

# Vérifier et installer les outils de qualité
echo ""
echo "🔧 Vérification des outils de qualité..."

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

# Vérifier et installer les outils Python
if ! $PYTHON_CMD -m black --version > /dev/null 2>&1; then
    echo "📦 Installation des outils Python (Black, Flake8, isort)..."
    cd backend
    $PYTHON_CMD -m pip install -r requirements.txt > /dev/null 2>&1
    cd ..
    echo "✅ Outils Python installés"
else
    echo "✅ Outils Python déjà installés"
fi

# Vérifier et installer les outils JavaScript
if ! command -v npm > /dev/null 2>&1; then
    echo "❌ npm n'est pas installé sur ce système"
    echo "💡 Installez Node.js pour continuer"
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

# Lancer le frontend directement
echo ""
echo "📱 Démarrage du frontend Expo..."
echo "   Le QR code va apparaître ci-dessous"
echo "   Appuyez sur 'w' pour ouvrir dans le navigateur"
echo ""

cd frontend
npm start

echo ""
echo "✅ Glycopilot démarré !"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8081"
