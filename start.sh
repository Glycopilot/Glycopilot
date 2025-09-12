#!/bin/bash

# Script pour lancer Glycopilot
echo "🚀 Démarrage de Glycopilot..."

# Ajouter Docker au PATH
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Lancer Docker Compose
docker compose up --build

echo "✅ Glycopilot démarré !"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8081"
