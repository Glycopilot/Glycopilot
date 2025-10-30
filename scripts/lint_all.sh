#!/bin/bash

echo "🚀 Vérification qualité du code complet..."
echo "========================================"

# Vérification Backend
echo ""
echo "📦 BACKEND PYTHON"
echo "=================="
./scripts/lint_backend.sh

echo ""
echo "📱 FRONTEND JAVASCRIPT"
echo "======================"
./scripts/lint_frontend.sh

echo ""
echo "🎯 RÉSUMÉ"
echo "========="
echo "✅ Toutes les vérifications terminées!"
echo "💡 Pour corriger automatiquement: ./scripts/fix_all.sh"
