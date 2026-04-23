DATA = ../backend/data/datasets/glycemia/BIG-IDEAs-Lab-Glycemic-Variability-and-Wearable-Device-Data.csv
PYTHON = .venv/Scripts/python  # Windows
# PYTHON = .venv/bin/python    # Linux/Mac — décommente cette ligne et commente celle du dessus

.PHONY: help setup train-baseline train-xgboost train-lstm train-transformer train-ensemble train-all evaluate start

help:
	@echo ""
	@echo "  Glycopilot AI Service — Commandes disponibles"
	@echo "  =============================================="
	@echo ""
	@echo "  Setup"
	@echo "    make setup              Installe l'environnement (Windows)"
	@echo "    bash setup.sh           Installe l'environnement (Linux/Mac)"
	@echo ""
	@echo "  Entraînement (chaque collègue peut prendre un modèle)"
	@echo "    make train-baseline     Entraîne le modèle Baseline (LR)"
	@echo "    make train-xgboost      Entraîne le modèle XGBoost"
	@echo "    make train-lstm         Entraîne le modèle LSTM"
	@echo "    make train-transformer  Entraîne le modèle Transformer"
	@echo "    make train-ensemble     Agrège les 4 modèles (à faire en dernier)"
	@echo "    make train-all          Entraîne tous les modèles en séquence"
	@echo ""
	@echo "  Évaluation"
	@echo "    make evaluate           Rapport d'évaluation sur le test set"
	@echo ""
	@echo "  Service"
	@echo "    make start              Lance le microservice FastAPI (port 8001)"
	@echo ""

setup:
	setup.bat

train-baseline:
	@echo "[INFO] Entraînement Baseline..."
	$(PYTHON) training/train_baseline.py --data $(DATA)
	@echo "[OK] Baseline terminé. Artefacts dans artifacts/baseline/"

train-xgboost:
	@echo "[INFO] Entraînement XGBoost..."
	$(PYTHON) training/train_xgboost.py --data $(DATA)
	@echo "[OK] XGBoost terminé. Artefacts dans artifacts/xgboost/"

train-lstm:
	@echo "[INFO] Entraînement LSTM (peut prendre 30-60 min)..."
	$(PYTHON) training/train_lstm.py --data $(DATA)
	@echo "[OK] LSTM terminé. Artefacts dans artifacts/lstm/"

train-transformer:
	@echo "[INFO] Entraînement Transformer (peut prendre 1-3h)..."
	$(PYTHON) training/train_transformer.py --data $(DATA)
	@echo "[OK] Transformer terminé. Artefacts dans artifacts/transformer/"

train-ensemble:
	@echo "[INFO] Entraînement Ensemble (nécessite les 4 modèles précédents)..."
	$(PYTHON) training/train_ensemble.py --data $(DATA)
	@echo "[OK] Ensemble terminé. Artefacts dans artifacts/ensemble/"

train-all: train-baseline train-xgboost train-lstm train-transformer train-ensemble
	@echo "[OK] Tous les modèles entraînés."

evaluate:
	$(PYTHON) training/evaluate.py --data $(DATA)

start:
	$(PYTHON) -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
