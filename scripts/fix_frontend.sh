#!/bin/bash

echo "🔧 Correction automatique du code Frontend..."

# Aller dans le dossier frontend
cd frontend

echo "📝 Formatage avec Prettier..."
npm run format

echo "🔧 Correction avec ESLint..."
npm run lint:fix

echo "✅ Frontend: Corrections automatiques terminées!"
