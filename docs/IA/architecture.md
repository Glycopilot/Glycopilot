# Architecture du Système IA — Glycopilot

## 1. Principes de conception

- **Découplage** : le microservice IA est indépendant du backend Django. Il communique uniquement via HTTP REST.
- **Résilience** : si le microservice est indisponible, Django continue de fonctionner normalement (pas de prédiction, pas de crash).
- **Versioning des modèles** : chaque prédiction est taggée avec `model_version` pour traçabilité complète.
- **Multi-horizons** : prédictions simultanées à 15, 30 et 60 minutes depuis un seul appel.
- **Features optionnelles** : les données wearable (HR, HRV, température) améliorent les prédictions mais ne sont pas requises.

---

## 2. Vue globale des composants

```
Glycopilot System
│
├── backend/                          ← Django (existant)
│   ├── apps/glycemia/
│   │   ├── models.py                 ← GlycemiaHisto, GlycemiaDataIA
│   │   ├── signals.py                ← Déclenche l'appel IA après chaque relevé
│   │   └── services/
│   │       └── ia_client.py          ← Client HTTP vers le microservice IA (À CRÉER)
│   └── apps/alerts/
│       └── services/trigger.py       ← Déclenche alertes si risque > seuil
│
├── ai_service/                       ← Microservice FastAPI (NOUVEAU)
│   ├── main.py                       ← Point d'entrée FastAPI
│   ├── api/
│   │   ├── routes/
│   │   │   ├── predict.py            ← POST /predict
│   │   │   └── health.py             ← GET /health
│   │   └── schemas.py                ← Pydantic request/response
│   ├── core/
│   │   ├── config.py                 ← Variables d'environnement
│   │   └── logger.py                 ← Logging structuré
│   ├── features/
│   │   ├── engineering.py            ← Construction du vecteur de features
│   │   └── preprocessing.py          ← Normalisation, gestion des NaN
│   ├── models/
│   │   ├── baseline.py               ← Modèle de référence (LR / ARIMA)
│   │   ├── lstm.py                   ← LSTM PyTorch
│   │   ├── transformer.py            ← Transformer PyTorch
│   │   └── ensemble.py               ← Agrégateur des modèles
│   ├── training/
│   │   ├── train.py                  ← Script d'entraînement principal
│   │   ├── evaluate.py               ← Métriques MAE, RMSE, MARD
│   │   └── cross_validation.py       ← Leave-one-subject-out CV
│   ├── artifacts/                    ← Modèles entraînés (.pt, .pkl, scalers)
│   ├── requirements.txt
│   └── Dockerfile
│
└── docs/IA/                          ← Documentation (CE RÉPERTOIRE)
```

---

## 3. Microservice FastAPI — `ai_service/`

### 3.1 Responsabilités

| Responsabilité | Description |
|---|---|
| Prédiction | Recevoir une fenêtre temporelle de données CGM et retourner les prédictions 15/30/60 min |
| Feature engineering | Transformer les relevés bruts en vecteur de features exploitable par les modèles |
| Gestion des modèles | Charger, versionner, et orchestrer les modèles ML |
| Recommandations | Générer un texte de recommandation clinique en fonction du risque prédit |
| Health check | Exposer un endpoint de santé pour monitoring |

### 3.2 Technologie

- **Framework** : FastAPI (async, performant, auto-documentation Swagger)
- **ML** : PyTorch (LSTM, Transformer), scikit-learn (Baseline, scalers)
- **Port** : 8001 (Django tourne sur 8000)
- **Python** : 3.11+

### 3.3 Communication avec Django

```
Django Backend                          AI Microservice
──────────────                          ───────────────

POST /api/ia/predict                    POST /predict
{                                →      {
  "user_id": "...",                       "user_id": "...",
  "for_time": "2024-01-01T12:00:00Z",    "for_time": "...",
  "readings": [                          "readings": [...],
    {"measured_at": "...",               "context": {...}
     "value": 105.0,               }
     "trend": "rising",
     "rate": 0.8}
  ]
}

                                   ←    {
                                          "y_hat_15": 112.0,
                                          "p10_15": 98.0,
                                          "p90_15": 126.0,
                                          "y_hat_30": 118.0,
                                          ...
                                          "risk_hypo_15": 0.05,
                                          "risk_hyper_15": 0.12,
                                          ...
                                          "recommendation": "Glycémie en hausse modérée. Pas d'action requise.",
                                          "confidence": 0.87,
                                          "model_version": "ensemble_v1.0",
                                          "runtime_ms": 42
                                        }
```

### 3.4 Gestion des erreurs et résilience

| Scénario | Comportement Django | Comportement IA service |
|---|---|---|
| Service IA down | Log warning, pas de prédiction, pas de crash | — |
| Données insuffisantes (< 6 relevés) | — | Retourne `status: "insufficient_data"` |
| Confiance faible (< 0.5) | Stocke mais ne notifie pas | Retourne `status: "low_confidence"` |
| Timeout (> 5s) | Ignore la réponse | — |
| Erreur interne IA | Log error | Retourne `status: "error"` + détails |

---

## 4. Intégration Django — `apps/glycemia/services/ia_client.py`

Le client HTTP est appelé depuis le signal `post_save` de `GlycemiaHisto`.

```
Nouveau relevé CGM
       │
       ▼
post_save signal (signals.py)
       │
       ├──► Broadcast WebSocket (existant)
       ├──► Déclenchement alertes règles (existant)
       └──► ia_client.request_prediction()   ← NOUVEAU
                    │
                    ▼
           Récupère les 24 derniers
           relevés de GlycemiaHisto
                    │
                    ▼
           POST ai_service/predict
                    │
                    ▼
           Reçoit prédictions JSON
                    │
                    ▼
           Crée GlycemiaDataIA en base
                    │
                    ▼
           Si risk_hypo_X > 0.7 ou
           risk_hyper_X > 0.7
                    │
                    ▼
           trigger_for_prediction()
           (alertes préventives)
```

---

## 5. Base de données — `GlycemiaDataIA`

Le modèle est déjà en place dans `backend/apps/glycemia/models.py`. Voici comment il est utilisé dans le flux IA :

| Champ | Rempli par | Source |
|---|---|---|
| `user`, `device` | Django ia_client | Session courante |
| `for_time` | Django ia_client | `measured_at` du dernier relevé |
| `input_start`, `input_end` | Django ia_client | Fenêtre des relevés envoyés |
| `model_version` | Microservice IA | Tag du modèle chargé |
| `source` | Microservice IA | `"ensemble"` / `"lstm"` / etc. |
| `y_hat_15/30/60` | Microservice IA | Sorties du modèle |
| `p10_X`, `p90_X` | Microservice IA | Intervalles de confiance |
| `risk_hypo_X`, `risk_hyper_X` | Microservice IA | Scores de risque |
| `confidence` | Microservice IA | Score agrégé |
| `recommendation` | Microservice IA | Texte généré par règles |
| `input_readings_count` | Microservice IA | Nombre de relevés utilisés |
| `missing_ratio` | Microservice IA | Taux de données manquantes |
| `runtime_ms` | Microservice IA | Temps d'exécution |

---

## 6. Fenêtre temporelle d'entrée

Le modèle utilise une fenêtre glissante de **2 heures** de données CGM (environ 24 relevés à fréquence 5 min) pour prédire les 15/30/60 prochaines minutes.

```
t-120min ──────────────────────────── t=0 ──► t+15 ──► t+30 ──► t+60
│                                      │        │         │         │
│  Fenêtre d'entrée (24 relevés)       │  y_hat │  y_hat  │  y_hat  │
│  Features : glucose, trend, rate,    │   _15  │   _30   │   _60   │
│  lags, rolling stats, HR, HRV, temp  │        │         │         │
└──────────────────────────────────────┘
```

Raisons du choix de 2h :
- Couvre les effets postprandiaux (pic glycémique ~1h après repas)
- Inclut l'effet de l'exercice récent
- Compatible avec la fréquence CGM (5 min) → 24 points = séquence LSTM raisonnable
- Au-delà de 2h, le signal glycémique perd de sa valeur prédictive à court terme

---

## 7. Génération des recommandations

Les recommandations sont générées par un système de règles basé sur les sorties du modèle :

```python
# Logique de recommandation (simplifiée)

if risk_hypo_30 > 0.7:
    → "Risque d'hypoglycémie dans 30 min. Consommez 15g de glucides rapides."

elif risk_hypo_60 > 0.5:
    → "Tendance à la baisse détectée. Surveillez votre glycémie."

elif risk_hyper_30 > 0.7:
    → "Risque d'hyperglycémie dans 30 min. Vérifiez votre dernière dose d'insuline."

elif y_hat_30 in [100, 140]:
    → "Glycémie stable. Continuez votre activité normale."

elif trend == "rising" and rate > 2.0:
    → "Montée rapide détectée (+{rate} mg/dL/min). Restez attentif."
```

---

## 8. Déploiement Docker

Le microservice sera conteneurisé et orchestré avec Docker Compose aux côtés du backend Django existant.

```yaml
# Extrait docker-compose.yml (à ajouter)
ai_service:
  build: ./ai_service
  ports:
    - "8001:8001"
  volumes:
    - ./ai_service/artifacts:/app/artifacts
  environment:
    - MODEL_VERSION=ensemble_v1.0
    - LOG_LEVEL=INFO
  depends_on:
    - db
```

Le backend Django accède au service via `http://ai_service:8001` en réseau Docker interne.

---

## 9. Sécurité

- Le microservice IA n'est **pas exposé publiquement** — accessible uniquement depuis le réseau Docker interne
- Les échanges incluent un `X-Internal-Token` partagé via variable d'environnement
- Aucune donnée patient n'est persistée dans le microservice IA (stateless)
- Les modèles entraînés sont stockés localement dans `artifacts/` (pas de cloud requis en V1)
