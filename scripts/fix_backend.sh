#!/bin/bash

echo "Correction automatique du code Backend..."

# Aller dans le dossier backend
cd backend

# Vérifier que le venv existe
if [ ! -f "venv/bin/activate" ]; then
    echo "ERREUR: venv non trouve dans backend/"
    echo "Creez un venv avec: cd backend && python -m venv venv"
    echo "Puis installez les deps: source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Activer le venv
source venv/bin/activate

echo "Organisation des imports avec isort..."
python -m isort .

echo "Formatage avec Black..."
python -m black .

echo "Verification finale avec Flake8..."
python -m flake8 . || echo "Il reste des erreurs flake8 a corriger manuellement"

deactivate

echo ""
echo "Corrections automatiques terminees!"
echo "Les fichiers ont ete modifies. N'oubliez pas de les git add."
