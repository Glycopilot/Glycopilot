#!/bin/bash

echo "🔍 Vérification qualité du code Frontend..."

# Aller dans le dossier frontend
cd frontend

echo "📝 Formatage avec Prettier..."
npm run format:check

echo "🔧 Vérification avec ESLint..."
npm run lint

echo "✅ Frontend: Toutes les vérifications terminées!"
