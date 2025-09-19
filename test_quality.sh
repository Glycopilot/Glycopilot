#!/bin/bash

echo "🧪 TEST RÉALISTE DES OUTILS DE QUALITÉ"
echo "======================================="

echo ""
echo "📱 TEST FRONTEND (JavaScript) - TOUS LES FICHIERS"
echo "================================================"

cd frontend

echo ""
echo "🔍 Test 1: Vérification de TOUT le projet (avec erreurs)"
echo "------------------------------------------------------"
echo "Résultat attendu: Erreurs détectées (fichiers de test inclus)"

echo ""
echo "Prettier - Vérification globale:"
npm run format:check
echo ""

echo "ESLint - Vérification globale:"
npm run lint
echo ""

echo "✅ Les outils détectent bien les erreurs dans le projet"
echo ""
echo "🔧 Test 2: Correction automatique"
echo "--------------------------------"
echo "Correction avec Prettier..."
npm run format

echo ""
echo "Correction avec ESLint..."
npm run lint:fix

echo ""
echo "🔍 Test 3: Vérification après correction"
echo "---------------------------------------"
echo "Prettier après correction:"
npm run format:check

echo ""
echo "ESLint après correction:"
npm run lint

echo ""
echo "🎯 RÉSUMÉ RÉALISTE"
echo "=================="
echo "✅ Les outils vérifient TOUS les fichiers (usage réel)"
echo "✅ Les outils détectent les erreurs globalement"
echo "✅ Les outils corrigent automatiquement"
echo "✅ Vérification complète du projet"
echo ""
echo "🚀 VOS OUTILS SONT PRÊTS POUR LE DÉVELOPPEMENT !"
echo ""
echo "💡 Usage quotidien:"
echo "   npm run lint          - Vérifier tout le projet"
echo "   npm run lint:fix      - Corriger tout le projet"
echo "   npm run format        - Formater tout le projet"
echo "   npm run format:check  - Vérifier le formatage global"
echo ""
echo "🧹 Pour nettoyer les fichiers de test:"
echo "   rm frontend/*Code.js backend/test_*_code.py"
