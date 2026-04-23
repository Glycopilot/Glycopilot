# API du Microservice IA

## Informations générales

| Paramètre | Valeur |
|---|---|
| Base URL (dev) | `http://localhost:8001` |
| Base URL (Docker) | `http://ai_service:8001` |
| Format | JSON |
| Auth | Header `X-Internal-Token: <shared_secret>` |
| Documentation auto | `http://localhost:8001/docs` (Swagger UI) |

---

## Endpoints

### `GET /health`

Vérifie que le service est opérationnel et que les modèles sont chargés.

**Réponse 200**
```json
{
  "status": "ok",
  "models_loaded": {
    "baseline": true,
    "lstm": true,
    "transformer": true,
    "ensemble": true
  },
  "model_version": "ensemble_v1.0",
  "uptime_seconds": 3421
}
```

**Réponse 503** (si modèles non chargés)
```json
{
  "status": "degraded",
  "models_loaded": {
    "baseline": true,
    "lstm": false,
    "transformer": false,
    "ensemble": false
  },
  "detail": "LSTM/Transformer artifacts not found. Running baseline only."
}
```

---

### `POST /predict`

Génère les prédictions glycémiques multi-horizons pour un utilisateur.

**Request Body**

```json
{
  "user_id": "42",
  "for_time": "2024-11-01T14:30:00Z",
  "readings": [
    {
      "measured_at": "2024-11-01T12:30:00Z",
      "value": 98.0,
      "trend": "flat",
      "rate": 0.1,
      "context": "fasting"
    },
    {
      "measured_at": "2024-11-01T12:35:00Z",
      "value": 101.0,
      "trend": "rising",
      "rate": 0.6,
      "context": "fasting"
    }
  ],
  "wearable": {
    "hr_mean": 68.5,
    "hr_std": 4.2,
    "hrv_rmssd": 42.1,
    "temp_mean": 34.8
  },
  "patient_meta": {
    "hba1c": 6.5,
    "gender_is_female": 1
  }
}
```

**Champs du body**

| Champ | Type | Requis | Description |
|---|---|---|---|
| `user_id` | string | Oui | ID de l'utilisateur |
| `for_time` | datetime (ISO) | Oui | Instant de référence t=0 |
| `readings` | array | Oui | Min 6 relevés, max 100 |
| `readings[].measured_at` | datetime | Oui | Timestamp du relevé |
| `readings[].value` | float | Oui | Glycémie en mg/dL (20-600) |
| `readings[].trend` | string | Non | "rising", "falling", "flat" |
| `readings[].rate` | float | Non | mg/dL par minute |
| `readings[].context` | string | Non | "fasting", "postprandial_1h", etc. |
| `wearable` | object | Non | Données capteur wearable |
| `wearable.hr_mean` | float | Non | FC moyenne (bpm) |
| `wearable.hr_std` | float | Non | Écart-type FC |
| `wearable.hrv_rmssd` | float | Non | HRV RMSSD (ms) |
| `wearable.temp_mean` | float | Non | Température cutanée (°C) |
| `patient_meta` | object | Non | Métadonnées patient |
| `patient_meta.hba1c` | float | Non | HbA1c (%) |
| `patient_meta.gender_is_female` | int | Non | 0 ou 1 |

**Réponse 200 — Succès**

```json
{
  "status": "ok",
  "model_version": "ensemble_v1.0",
  "source": "ensemble",
  "confidence": 0.87,
  "runtime_ms": 42,
  "input_readings_count": 24,
  "missing_ratio": 0.0,

  "predictions": {
    "horizon_15": {
      "y_hat": 112.0,
      "p10": 98.0,
      "p90": 126.0,
      "risk_hypo": 0.02,
      "risk_hyper": 0.08
    },
    "horizon_30": {
      "y_hat": 118.0,
      "p10": 101.0,
      "p90": 135.0,
      "risk_hypo": 0.01,
      "risk_hyper": 0.15
    },
    "horizon_60": {
      "y_hat": 125.0,
      "p10": 105.0,
      "p90": 148.0,
      "risk_hypo": 0.01,
      "risk_hyper": 0.22
    }
  },

  "recommendation": "Glycémie stable avec légère tendance à la hausse. Pas d'action requise.",
  "recommendation_level": "info",

  "sub_models": {
    "baseline": { "y_hat_30": 115.0, "confidence": 0.72 },
    "lstm":     { "y_hat_30": 119.0, "confidence": 0.88 },
    "transformer": { "y_hat_30": 120.0, "confidence": 0.91 }
  }
}
```

**Réponse 200 — Données insuffisantes**

```json
{
  "status": "insufficient_data",
  "detail": "Minimum 6 readings required, got 3.",
  "model_version": "ensemble_v1.0",
  "predictions": null,
  "recommendation": null
}
```

**Réponse 200 — Faible confiance**

```json
{
  "status": "low_confidence",
  "confidence": 0.38,
  "detail": "High variability in input signal. Predictions may be unreliable.",
  "predictions": { ... },
  "recommendation": "Données insuffisamment stables pour une prédiction fiable. Vérifiez votre capteur."
}
```

**Réponse 422 — Validation error**

```json
{
  "detail": [
    {
      "loc": ["body", "readings", 0, "value"],
      "msg": "ensure this value is greater than or equal to 20",
      "type": "value_error.number.not_ge"
    }
  ]
}
```

**Réponse 500 — Erreur interne**

```json
{
  "status": "error",
  "detail": "Model inference failed: CUDA out of memory",
  "model_version": "ensemble_v1.0"
}
```

---

### `GET /models`

Liste les modèles disponibles et leur version.

**Réponse 200**
```json
{
  "models": [
    {
      "name": "baseline",
      "version": "lr_v1.0",
      "loaded": true,
      "artifact_path": "artifacts/baseline_lr_v1.0.pkl",
      "trained_at": "2024-11-01T10:00:00Z",
      "val_mae_30": 13.2
    },
    {
      "name": "lstm",
      "version": "lstm_v1.0",
      "loaded": true,
      "artifact_path": "artifacts/lstm_v1.0.pt",
      "trained_at": "2024-11-01T11:30:00Z",
      "val_mae_30": 8.9
    },
    {
      "name": "transformer",
      "version": "transformer_v1.0",
      "loaded": true,
      "artifact_path": "artifacts/transformer_v1.0.pt",
      "trained_at": "2024-11-01T13:00:00Z",
      "val_mae_30": 8.1
    },
    {
      "name": "ensemble",
      "version": "ensemble_v1.0",
      "loaded": true,
      "artifact_path": "artifacts/ensemble_v1.0.pkl",
      "trained_at": "2024-11-01T14:00:00Z",
      "val_mae_30": 7.5
    }
  ]
}
```

---

## Niveaux de recommandation

| Niveau | Valeur | Déclencheur | Exemple |
|---|---|---|---|
| `info` | 0 | Glycémie stable | "Tout va bien." |
| `watch` | 1 | Tendance notable | "Légère hausse, restez attentif." |
| `warning` | 2 | Risque modéré (0.3–0.7) | "Risque d'hypo dans 60 min." |
| `alert` | 3 | Risque élevé (> 0.7) | "Hypoglycémie probable dans 30 min !" |
| `critical` | 4 | Risque très élevé (> 0.9) | "Prenez 15g de glucides maintenant." |

---

## Codes de statut

| Statut | Description | Django persiste ? | Alerte déclenchée ? |
|---|---|---|---|
| `ok` | Prédiction normale | Oui | Si risk > seuil |
| `low_confidence` | Confiance < 0.5 | Oui | Non |
| `insufficient_data` | Moins de 6 relevés | Non | Non |
| `error` | Erreur interne | Non | Non |

---

## Client Django — `ia_client.py`

Le client implémenté dans `backend/apps/glycemia/services/ia_client.py` :

```python
import httpx
from django.conf import settings

AI_SERVICE_URL = settings.AI_SERVICE_URL        # http://ai_service:8001
AI_SERVICE_TOKEN = settings.AI_SERVICE_TOKEN    # secret partagé
AI_SERVICE_TIMEOUT = 5.0                        # secondes

def request_prediction(user, readings: list) -> dict | None:
    """
    Appelle le microservice IA et retourne la réponse JSON.
    Retourne None si le service est indisponible ou en erreur.
    """
    payload = {
        "user_id": str(user.id),
        "for_time": readings[-1]["measured_at"],
        "readings": readings,
    }
    try:
        response = httpx.post(
            f"{AI_SERVICE_URL}/predict",
            json=payload,
            headers={"X-Internal-Token": AI_SERVICE_TOKEN},
            timeout=AI_SERVICE_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()
    except (httpx.RequestError, httpx.HTTPStatusError):
        return None
```
