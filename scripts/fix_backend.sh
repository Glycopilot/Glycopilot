#!/bin/bash

echo "🔧 Correction automatique du code Backend..."

# Aller dans le dossier backend
cd backend

echo "📝 Formatage avec Black..."
python3 -m black .

echo "📦 Organisation des imports avec isort..."
python3 -m isort .

echo "✅ Backend: Corrections automatiques terminées!"
