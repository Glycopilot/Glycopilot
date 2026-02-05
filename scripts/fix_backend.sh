#!/bin/bash

echo "🔧 Correction automatique du code Backend..."

# Aller dans le dossier backend
cd backend

echo "� Organisation des imports avec isort..."
python3 -m isort .

echo "🎨 Formatage avec Black..."
python3 -m black .

echo "🔍 Vérification finale avec Flake8..."
python3 -m flake8 . || echo "⚠️  Il reste des erreurs flake8 à corriger manuellement"

echo ""
echo "✅ Corrections automatiques terminées!"
echo "💡 Les fichiers ont été modifiés. N'oubliez pas de les git add."
