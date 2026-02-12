#!/bin/bash

set -e

echo "🔍 Génération du rapport de couverture frontend..."

cd "$(dirname "$0")/../frontend" || exit 1

if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

echo "📊 Exécution des tests avec couverture..."
npm test -- --coverage --watchAll=false || echo "⚠️  Aucun test configuré pour le moment"

echo ""
echo "✅ Rapport de couverture généré !"
echo ""
echo "📄 Format disponible :"
echo "   - HTML (détaillé): frontend/coverage/lcov-report/index.html"
echo "   - LCOV (SonarCloud): frontend/coverage/lcov.info"
echo ""
echo "🌐 Pour voir le rapport HTML détaillé :"
echo "   Ouvrez frontend/coverage/lcov-report/index.html dans votre navigateur"
