#!/bin/bash

# Script pour lancer Glycopilot
echo "🚀 Démarrage de Glycopilot..."

# Ajouter Docker au PATH
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Vérifier et configurer les Git hooks (une seule fois)
if [ ! -f ".git/hooks/pre-commit" ] || [ ! -f ".git/hooks/pre-push" ]; then
    echo ""
    echo "🔧 Configuration des Git hooks (première fois)..."
    
    # Vérifier si on est dans un repo Git
    if [ -d ".git" ]; then
        # Installer pre-commit
        cd backend
        pip install pre-commit > /dev/null 2>&1
        cd ..
        
        # Configurer pre-commit
        pre-commit install > /dev/null 2>&1
        
        # Le hook pre-push est déjà créé
        echo "✅ Git hooks configurés !"
        echo "   → Vérification automatique avant chaque commit/push"
    else
        echo "⚠️  Pas de repository Git détecté"
    fi
else
    echo "✅ Git hooks déjà configurés"
fi

# Lancer Docker Compose avec logs en temps réel
echo ""
echo "📱 Le QR code Expo va apparaître ci-dessous..."
echo "   Installez Expo Go sur votre téléphone pour scanner le QR code"
echo ""

docker compose up --build

echo ""
echo "✅ Glycopilot démarré !"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8081"
