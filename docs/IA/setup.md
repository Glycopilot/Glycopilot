# Guide d'installation & d'entraînement

Ce guide permet à chaque membre de l'équipe d'installer l'environnement et d'entraîner son modèle de manière indépendante.

> **Recommandation** : utiliser **WSL2 (Ubuntu 24.04)** sur Windows. C'est l'environnement validé pour ce projet.

---

## Prérequis

- **WSL2 + Ubuntu 24.04** sur Windows (recommandé) — [Guide d'installation WSL](https://learn.microsoft.com/fr-fr/windows/wsl/install)
- **Python 3.12** (déjà inclus dans Ubuntu 24.04)
- Le dataset placé dans `backend/data/datasets/glycemia/`

---

## 1. Ouvrir un terminal WSL et aller dans le projet

Lance **Ubuntu** depuis le menu Démarrer, puis :

```bash
cd /mnt/d/Projets\ epitech/ESP/Glycopilot/ai_service
```

> Adapte le chemin si ton projet est sur un autre disque (`/mnt/c/...`).

---

## 2. Installation de l'environnement (une seule fois)

### 2a. Corriger le réseau WSL (si apt ne fonctionne pas)

```bash
sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'
```

### 2b. Installer python3.12-venv

```bash
sudo apt-get update && sudo apt-get install -y python3.12-venv python3-pip
```

### 2c. Créer le venv et installer les dépendances

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2d. Créer le fichier .env

```bash
cp .env.example .env
```

---

## 3. Activer l'environnement

À chaque nouvelle session terminal :

```bash
cd /mnt/d/Projets\ epitech/ESP/Glycopilot/ai_service
source .venv/bin/activate
```

Le prompt affiche `(.venv)` quand c'est actif.

---

## 4. Lancer le microservice

```bash
python main.py
```

Résultat attendu :
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

Vérifier dans un autre terminal :
```bash
curl http://localhost:8001/health
```

Réponse normale avant entraînement (`baseline: true`, reste `false`) :
```json
{"status":"degraded","models_loaded":{"baseline":true,"xgboost":false,"lstm":false,"transformer":false,"ensemble":false},...}
```

Swagger UI : http://localhost:8001/docs

---

## 5. Entraîner son modèle

Chaque membre prend un modèle. L'ensemble se fait en dernier une fois les 4 autres disponibles.

| Modèle | Durée estimée | Commande |
|---|---|---|
| Baseline | < 2 min | `python training/train_baseline.py` |
| XGBoost | < 5 min | `python training/train_xgboost.py` |
| LSTM | 30–60 min | `python training/train_lstm.py` |
| Transformer | 1–3h | `python training/train_transformer.py` |
| Ensemble | < 2 min (après les 4 autres) | `python training/train_ensemble.py` |

### Options disponibles

```bash
python training/train_lstm.py \
  --data ../backend/data/datasets/glycemia/BIG-IDEAs-Lab-Glycemic-Variability-and-Wearable-Device-Data.csv \
  --test-participant 001 \
  --version v1.0 \
  --epochs 100 \
  --device cpu       # ou cuda si GPU NVIDIA disponible
```

---

## 6. Partager les artefacts entraînés

Les fichiers `.pt` et `.pkl` dans `artifacts/` sont ignorés par git (trop lourds).  
Les partager via le drive partagé du projet ou Discord.

```
artifacts/
├── baseline/    lr_15/30/60_v1.0.pkl + q10/q90
├── xgboost/     xgb_15/30/60_v1.0.pkl + q10/q90
├── lstm/        lstm_v1.0.pt
├── transformer/ transformer_v1.0.pt
├── ensemble/    ensemble_v1.0.pkl
└── scalers/     features_scaler_baseline.pkl
```

---

## 7. Dépannage

### apt ne télécharge rien / "Network unreachable"
```bash
sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'
```

### "ModuleNotFoundError"
→ Le venv n'est pas activé : `source .venv/bin/activate`

### "FileNotFoundError: dataset CSV not found"
→ Vérifie que le dataset est dans `backend/data/datasets/glycemia/`.

### Service démarre en mode `degraded`
→ Normal avant entraînement. Le service fonctionne en fallback Baseline. Lance les scripts d'entraînement puis redémarre.

### LSTM/Transformer lent sur CPU
→ Normal (30–60 min). Utilise `--device cuda` si GPU NVIDIA + CUDA disponible.
