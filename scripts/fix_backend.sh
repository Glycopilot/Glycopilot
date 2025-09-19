#!/bin/bash

echo "🔧 Correction automatique du code Backend..."

# Aller dans le dossier backend
cd backend

echo "📝 Formatage avec Black..."
black .

echo "📦 Organisation des imports avec isort..."
isort .

echo "✅ Backend: Corrections automatiques terminées!"
