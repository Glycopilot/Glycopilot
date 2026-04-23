#!/usr/bin/env bash
set -e

echo "========================================"
echo " Glycopilot AI Service - Setup (Linux/Mac)"
echo "========================================"

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python 3 n'est pas installé."
    echo "  Ubuntu/Debian : sudo apt install python3 python3-venv python3-pip"
    echo "  Mac           : brew install python"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "[OK] Python $PYTHON_VERSION détecté."

# Create virtual env
if [ ! -d ".venv" ]; then
    echo "[INFO] Création de l'environnement virtuel..."
    python3 -m venv .venv
    echo "[OK] Environnement virtuel créé dans .venv/"
else
    echo "[OK] Environnement virtuel existant détecté."
fi

# Activate and install
source .venv/bin/activate
echo "[INFO] Installation des dépendances..."
pip install --upgrade pip --quiet
pip install -r requirements.txt

# Copy .env
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "[OK] Fichier .env créé depuis .env.example"
else
    echo "[OK] Fichier .env existant conservé."
fi

# Create artifact dirs
mkdir -p artifacts/{baseline,xgboost,lstm,transformer,ensemble,scalers,metadata}
echo "[OK] Dossiers artifacts/ créés."

echo ""
echo "========================================"
echo " Setup terminé !"
echo "========================================"
echo ""
echo "  Pour activer l'environnement :"
echo "    source .venv/bin/activate"
echo ""
echo "  Pour entraîner un modèle :"
echo "    make train-baseline"
echo "    make train-xgboost"
echo "    make train-lstm"
echo "    make train-transformer"
echo "    make train-ensemble"
echo ""
