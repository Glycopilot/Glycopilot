#!/bin/bash

echo "🔧 Correction automatique du code complet..."
echo "==========================================="

# Correction Backend
echo ""
echo "📦 BACKEND PYTHON"
echo "=================="
./scripts/fix_backend.sh

echo ""
echo "📱 FRONTEND JAVASCRIPT"
echo "======================"
./scripts/fix_frontend.sh

echo ""
echo "🎯 RÉSUMÉ"
echo "========="
echo "✅ Toutes les corrections automatiques terminées!"
echo "💡 Pour vérifier: ./scripts/lint_all.sh"
