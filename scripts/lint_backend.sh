#!/bin/bash

echo "Verification qualite du code Backend..."

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

echo "Formatage avec Black..."
black --check .

echo "Verification avec Flake8..."
flake8 .

echo "Organisation des imports avec isort..."
isort --check-only .

deactivate

echo "Backend: Toutes les verifications terminees!"
