#!/bin/bash

set -e

echo "🔍 Génération du rapport de couverture backend..."

cd "$(dirname "$0")/../backend" || exit 1

if ! python3 -m pytest --version > /dev/null 2>&1; then
    echo "❌ pytest n'est pas installé. Installation..."
    pip3 install pytest pytest-cov pytest-django
fi

echo "📊 Exécution des tests avec couverture..."
python3 -m pytest --cov=. --cov-report=xml:coverage.xml --cov-report=html:htmlcov --cov-report=term -v

echo ""
echo "✅ Rapport de couverture généré !"
echo ""
echo "📄 Formats disponibles :"
echo "   - XML (SonarCloud): backend/coverage.xml"
echo "   - HTML (détaillé): backend/htmlcov/index.html"
echo ""
echo "🌐 Pour voir le rapport HTML détaillé :"
echo "   Ouvrez backend/htmlcov/index.html dans votre navigateur"
echo ""
echo "📊 Résumé affiché ci-dessus dans le terminal"
