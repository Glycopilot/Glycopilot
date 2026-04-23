# MLOps — Entraînement, Évaluation, Déploiement

## 1. Structure des artefacts

```
ai_service/artifacts/
├── scalers/
│   ├── glucose_scaler.pkl       ← StandardScaler sur les valeurs glycémiques
│   └── features_scaler.pkl      ← StandardScaler sur toutes les features
├── baseline/
│   ├── lr_15_v1.0.pkl
│   ├── lr_30_v1.0.pkl
│   └── lr_60_v1.0.pkl
├── lstm/
│   └── lstm_v1.0.pt             ← Weights PyTorch
├── transformer/
│   └── transformer_v1.0.pt
├── ensemble/
│   └── ensemble_v1.0.pkl        ← Méta-modèles Ridge
└── metadata/
    └── training_report_v1.0.json ← Métriques, dates, splits
```

---

## 2. Pipeline d'entraînement

### Ordre d'exécution

```
1. python training/train.py --model baseline
      → Entraîne LR sur toutes les features tabulaires
      → Sauvegarde lr_15/30/60_vX.pkl + scalers

2. python training/train.py --model lstm
      → Construit les séquences (batch, 24, N_features)
      → Entraîne avec early stopping
      → Sauvegarde lstm_vX.pt

3. python training/train.py --model transformer
      → Même pipeline que LSTM, architecture différente
      → Sauvegarde transformer_vX.pt

4. python training/train.py --model ensemble
      → Charge les 3 modèles précédents
      → Génère les prédictions sur le val set
      → Entraîne les méta-modèles Ridge sur ces prédictions
      → Sauvegarde ensemble_vX.pkl

5. python training/evaluate.py --model ensemble --split test
      → Rapport final sur le test set (LOSO)
      → Génère training_report_vX.json
```

### Arguments CLI communs

```bash
python training/train.py \
  --model [baseline|lstm|transformer|ensemble] \
  --data backend/data/datasets/glycemia/BIG-IDEAs-Lab-Glycemic-Variability-and-Wearable-Device-Data.csv \
  --test-participant 001 \        # participant mis de côté pour le test
  --version v1.0 \
  --device cpu                   # ou cuda
```

---

## 3. Stratégie de validation

### Leave-One-Subject-Out (LOSO)

```
Participants disponibles : [001, 002, 003, 004, 005, ...]

Pour chaque run d'évaluation :
  ┌─────────────────────────────────────────────────────┐
  │  Test Set : participant sélectionné (ex: 001)       │
  ├─────────────────────────────────────────────────────┤
  │  Train : 80% chronologique des autres participants  │
  │  Val   : 20% chronologique des autres participants  │
  └─────────────────────────────────────────────────────┘

Répété N fois (une fois par participant = N-fold LOSO)
Métriques finales = moyenne sur tous les folds
```

### Pourquoi pas un split aléatoire ?
Un split aléatoire sur des séries temporelles crée du **data leakage** : le modèle voit des données futures pendant l'entraînement. La validation LOSO est le standard dans la littérature de prédiction glycémique.

---

## 4. Métriques de suivi

### Métriques principales

| Métrique | Formule | Objectif |
|---|---|---|
| MAE (mg/dL) | mean(\|y - ŷ\|) | < 15 @30min |
| RMSE (mg/dL) | sqrt(mean((y-ŷ)²)) | < 20 @30min |
| MARD (%) | mean(\|y-ŷ\|/y) × 100 | < 10% |
| Coverage 80% | P(y ∈ [p10, p90]) | 78-82% |

### Métriques cliniques

| Métrique | Formule | Objectif |
|---|---|---|
| Hypo recall | TP_hypo / (TP_hypo + FN_hypo) | > 90% |
| Hypo precision | TP_hypo / (TP_hypo + FP_hypo) | > 70% |
| Hyper recall | TP_hyper / (TP_hyper + FN_hyper) | > 85% |
| Clarke Zone A | % prédictions en zone A | > 95% |

---

## 5. Versioning des modèles

Convention de nommage : `{type}_v{major}.{minor}`

| Champ | Signification |
|---|---|
| `type` | baseline / lstm / transformer / ensemble |
| `major` | Changement d'architecture ou de dataset |
| `minor` | Retuning hyperparamètres, ajout de features |

Exemples :
- `lstm_v1.0` → première version LSTM
- `lstm_v1.1` → même architecture, ajout feature `is_weekend`
- `lstm_v2.0` → architecture modifiée (couches supplémentaires)
- `ensemble_v1.0` → ensemble combinant baseline_v1.0 + lstm_v1.0 + transformer_v1.0

Le champ `model_version` dans `GlycemiaDataIA` stocke la version de l'ensemble utilisé pour chaque prédiction.

---

## 6. Rapport d'entraînement

Chaque entraînement génère `artifacts/metadata/training_report_vX.json` :

```json
{
  "version": "ensemble_v1.0",
  "trained_at": "2024-11-01T14:00:00Z",
  "dataset": "BIG-IDEAs-Lab-Glycemic-Variability-and-Wearable-Device-Data.csv",
  "n_participants": 5,
  "test_participant": "001",
  "n_train_samples": 28000,
  "n_val_samples": 7000,
  "n_test_samples": 6000,
  "features": ["glucose", "glucose_lag_5min", "..."],
  "sub_models": {
    "baseline": "lr_v1.0",
    "lstm": "lstm_v1.0",
    "transformer": "transformer_v1.0"
  },
  "metrics": {
    "val": {
      "mae_15": 4.2, "mae_30": 7.8, "mae_60": 13.1,
      "rmse_15": 5.8, "rmse_30": 10.2, "rmse_60": 17.4,
      "coverage_80_30": 0.81
    },
    "test": {
      "mae_15": 4.5, "mae_30": 8.1, "mae_60": 13.8,
      "rmse_15": 6.1, "rmse_30": 10.8, "rmse_60": 18.2,
      "hypo_recall_30": 0.92,
      "hyper_recall_30": 0.87,
      "clarke_zone_a": 0.97
    }
  }
}
```

---

## 7. Déploiement Docker

### Dockerfile du microservice

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Ajout dans docker-compose.yml

```yaml
ai_service:
  build: ./ai_service
  container_name: glycopilot_ai
  ports:
    - "8001:8001"
  volumes:
    - ./ai_service/artifacts:/app/artifacts:ro
  environment:
    - MODEL_VERSION=ensemble_v1.0
    - LOG_LEVEL=INFO
    - INTERNAL_TOKEN=${AI_INTERNAL_TOKEN}
  networks:
    - glycopilot_network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
    interval: 30s
    timeout: 5s
    retries: 3
```

### Variables d'environnement Django à ajouter

```env
# backend/.env
AI_SERVICE_URL=http://ai_service:8001
AI_SERVICE_TOKEN=<shared_secret>
AI_SERVICE_TIMEOUT=5
AI_ENABLED=true
```

---

## 8. Monitoring en production

### Métriques à surveiller

| Métrique | Seuil d'alerte | Action |
|---|---|---|
| `runtime_ms` moyen > 500ms | Warning | Optimiser le modèle ou upgrade hardware |
| Taux `low_confidence` > 20% | Warning | Vérifier qualité des données CGM |
| Taux `insufficient_data` > 10% | Warning | Vérifier la synchronisation capteurs |
| MAE production vs MAE test : drift > 5 mg/dL | Alert | Ré-entraîner le modèle |
| Service health check fail | Critical | Restart automatique Docker |

### Feedback loop (futur)

La table `GlycemiaDataIA` permettra de mesurer la précision réelle des prédictions en comparant `y_hat_30` avec la vraie valeur enregistrée 30 min plus tard dans `GlycemiaHisto`. Ce feedback pourra alimenter un ré-entraînement périodique.

```python
# Calcul MAE production (job quotidien)
predictions = GlycemiaDataIA.objects.filter(
    created_at__gte=yesterday,
    status="ok"
)
for pred in predictions:
    actual = GlycemiaHisto.objects.filter(
        user=pred.user,
        measured_at__range=(pred.for_time + 28min, pred.for_time + 32min)
    ).first()
    if actual:
        production_mae_30.append(abs(pred.y_hat_30 - actual.value))
```

---

## 9. Checklist avant mise en production

- [ ] MAE @30min < 15 mg/dL sur le test set
- [ ] Hypo recall > 90% sur le test set
- [ ] Clarke Zone A > 95%
- [ ] Coverage 80% entre 75% et 85%
- [ ] Health check endpoint répond en < 200ms
- [ ] Prédiction complète en < 500ms
- [ ] Artefacts versionnés et sauvegardés
- [ ] Variables d'environnement configurées
- [ ] Docker Compose testé end-to-end
- [ ] Client Django `ia_client.py` intégré dans les signals
