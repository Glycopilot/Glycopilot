#!/bin/bash

echo "Verification qualite du code Backend..."

# Aller dans le dossier backend
cd backend

echo "Formatage avec Black..."
black --check .

echo "Verification avec Flake8..."
flake8 .

echo "Organisation des imports avec isort..."
isort --check-only .

echo "Backend: Toutes les verifications terminees!"
