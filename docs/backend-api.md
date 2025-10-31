# Backend API Specification

Ce document décrit l’API backend à mettre en place pour couvrir les fonctionnalités F02 (Dashboard) et F03 (Suivi de la glycémie), en cohérence avec le modèle conceptuel de données fourni. Chaque endpoint est relié aux tables concernées du MPC afin d’assurer un alignement clair entre la couche API et la persistance.

## 1. Convention générale

- Base path : `/api/v1`
- Authentification : `Authorization: Bearer <JWT>` (sauf mention contraire)
- En-têtes communs : `Content-Type: application/json`, `Accept: application/json`
- Fuseau et format temporels : ISO 8601 UTC
- Toutes les réponses sont en JSON, sauf les exports (PDF/CSV)
- Gestion des erreurs standard :

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## 2. Plan d’implémentation progressif

| Priorité | Bloc fonctionnel | Objectif |
| --- | --- | --- |
| 0 | Authentification & Profil | Sécuriser l’accès et récupérer les préférences de base |
| 1 | Glycémie – mesures & alertes essentielles | Saisie manuelle, lecture, alertes, WebSocket |
| 2 | Dashboard | Agrégat principal et gestion du layout |
| 3 | Alertes avancées & actions rapides | Snooze, escalade, actions guidées |
| 4 | Médicaments | Prochaines prises, confirmations, stocks |
| 5 | Nutrition & activité | Résumés pour le dashboard |
| 6 | Agrégats glycémie & rapports | TIR, AGP, exports |
| 7 | Capteurs & prédictions | Maintenance capteurs, prédictions IA |

Les sections suivantes détaillent chaque endpoint, leurs structures de requête/réponse et la table (ou vue) associée.

---

## Priorité 0 — Authentification & Profil

### `POST /api/v1/auth/token`
- **Description** : obtention ou renouvellement d’un token d’accès.
- **Headers** : `Content-Type: application/json`
- **Body** :

```json
{
  "refreshToken": "string"
}
```

- **Réponse 200** :

```json
{
  "accessToken": "string",
  "expiresIn": 3600
}
```

- **Erreurs** : `401` refresh token invalide.

### `POST /api/v1/auth/logout`
- **Description** : invalide le token courant et clôture les sessions temps réel.
- **Headers** : `Authorization`
- **Body** : _(vide)_
- **Réponse 204** : aucun contenu.
- **Erreurs** : `401` token invalide/expiré.

### `GET /api/v1/user/profile`
- **Description** : récupère les informations de profil essentielles.
- **Headers** : `Authorization`
- **Réponse 200** :

```json
{
  "userId": "uuid",
  "displayName": "John Doe",
  "email": "john@example.com",
  "unit": "mg/dL",
  "lowThreshold": 70,
  "highThreshold": 180,
  "createdAt": "2025-10-31T08:10:00Z"
}
```

- **Persistance** : table `USERS` (`user_id`, `email`, `first_name`, `last_name`, `unit` à ajouter), jointure facultative avec `PROFILS` via `USERS_PROFILS` pour remonter les rôles.

### `PATCH /api/v1/user/profile`
- **Description** : met à jour partiellement le profil.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "displayName": "John Doe",
  "unit": "mmol/L"
}
```

- **Réponse 200** : profil complet mis à jour.
- **Erreurs** : `400` mauvaise valeur, `409` conflit (unité non supportée).

### `GET /api/v1/user/preferences`
- **Description** : récupère les préférences (seuils, heures silencieuses, etc.).
- **Headers** : `Authorization`
- **Réponse 200** :

```json
{
  "glucose": {
    "low": 70,
    "high": 180
  },
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "06:00",
    "allowCritical": true
  }
}
```

- **Persistance** : colonnes à prévoir dans `USERS` (ex. `low_threshold`, `high_threshold`, `quiet_hours_start`, `quiet_hours_end`, `quiet_hours_critical`).

### `PATCH /api/v1/user/preferences`
- **Description** : modifications partielles des préférences.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "glucose": {
    "low": 75
  },
  "quietHours": {
    "enabled": false
  }
}
```

- **Réponse 200** : préférences complètes après mise à jour.
- **Erreurs** : `400`, `409`.

---

## Priorité 1 — Glycémie (mesures & alertes essentielles)

### `POST /api/v1/glucose/manual-readings`
- **Description** : enregistre une mesure manuelle.
- **Headers** : `Authorization`, `Content-Type`, `X-Idempotency-Key` (recommandé)
- **Body** :

```json
{
  "value": 110,
  "unit": "mg/dL",
  "context": "preprandial",
  "recordedAt": "2025-10-31T07:45:00Z",
  "notes": "Before breakfast",
  "photoUrl": null,
  "location": {
    "lat": 48.8566,
    "lng": 2.3522
  }
}
```

- **Réponse 201** :

```json
{
  "readingId": "uuid",
  "value": 110,
  "unit": "mg/dL",
  "source": "manual",
  "context": "preprandial",
  "recordedAt": "2025-10-31T07:45:00Z",
  "createdAt": "2025-10-31T07:46:05Z",
  "requiresConfirmation": false,
  "triggeredAlert": null
}
```

- **Erreurs** : `400` (plage invalide), `409` (limite 20/jour), `422` (cohérence temporelle).
- **Persistance** : table `GLYCEMIA` (colonnes `user_id`, `measured_at`, `value`) et `GLYCEMIA_HISTO` pour l’historique. Ajouter colonnes `source`, `context`, `notes`, `photo_url`, `location_lat`, `location_lng` via migration.

### `GET /api/v1/glucose/current`
- **Description** : renvoie la dernière mesure connue et l’état du capteur.
- **Headers** : `Authorization`
- **Réponse 200** :

```json
{
  "value": 95,
  "unit": "mg/dL",
  "trend": "flat",
  "rate": 0.0,
  "recordedAt": "2025-10-31T08:00:00Z",
  "source": "cgm",
  "sensor": {
    "sensorId": "dexcom_g7_001",
    "status": "connected",
    "battery": 72,
    "signalQuality": "good"
  }
}
```

- **Persistance** : lecture depuis la dernière entrée `GLYCEMIA` et état capteur issu d’une table `SENSORS` à créer (FK `user_id`).

### `GET /api/v1/glucose/history`
- **Description** : historique des mesures.
- **Headers** : `Authorization`
- **Query** : `start`, `end`, `granularity=5m|15m|1h`, `source=cgm|manual|all`
- **Réponse 200** :

```json
{
  "entries": [
    {
      "readingId": "uuid",
      "value": 120,
      "unit": "mg/dL",
      "trend": "rising",
      "rate": 1.8,
      "recordedAt": "2025-10-30T22:00:00Z",
      "source": "cgm"
    }
  ],
  "nextCursor": null
}
```

- **Persistance** : dépend de `GLYCEMIA_HISTO`; prévoir index sur `(user_id, measured_at)`.

### `GET /api/v1/glucose/alerts`
- **Description** : liste des alertes en attente ou récemment déclenchées.
- **Headers** : `Authorization`
- **Query** : `state=pending|acknowledged`, `severity=critical|high|moderate`, `since`.
- **Réponse 200** :

```json
{
  "alerts": [
    {
      "alertId": "uuid",
      "type": "hypoglycemia",
      "severity": "critical",
      "value": 54,
      "unit": "mg/dL",
      "triggeredAt": "2025-10-31T06:15:00Z",
      "acknowledged": false
    }
  ]
}
```

- **Persistance** : jointure `USER_ALERTS` ↔ `ALERTS`, avec colonnes `sent_at`, `statut`. Envisager de remplacer `statut` bool par un enum (`pending`, `acknowledged`, `snoozed`, `escalated`).

### `POST /api/v1/glucose/alerts/{alertId}/acknowledge`
- **Description** : confirmation d’une alerte avec action prise.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "action": "treated",
  "notes": "Consumed 15g of carbs",
  "followUpAt": "2025-10-31T06:30:00Z"
}
```

- **Réponse 200** :

```json
{
  "alertId": "uuid",
  "state": "acknowledged",
  "acknowledgedAt": "2025-10-31T06:16:30Z"
}
```

- **Erreurs** : `404` alerte introuvable, `409` déjà accusaée.
- **Persistance** : mise à jour de `USER_ALERTS.statut`, ajout timestamp `acknowledged_at`.

### `WSS /api/v1/streams/glucose`
- **Description** : flux temps réel des mesures CGM et alertes critiques.
- **Headers** : `Authorization`
- **Message de souscription** :

```json
{
  "type": "subscribe",
  "topic": "glucose.live",
  "sensorId": "dexcom_g7_001"
}
```

- **Message serveur (exemple)** :

```json
{
  "type": "glucose_live",
  "payload": {
    "value": 92,
    "unit": "mg/dL",
    "trend": "falling",
    "rate": -1.2,
    "recordedAt": "2025-10-31T08:05:00Z",
    "prediction": {
      "window": 30,
      "riskHypo": 0.18,
      "riskHyper": 0.02
    }
  }
}
```

- **Heartbeat** : `{ "type": "ping", "timestamp": "..." }` → réponse client `{ "type": "pong" }`.
- **Gestion** : reconnexion avec back-off (5 s → 30 s).
- **Persistance** : flux alimenté par `GLYCEMIA` (insertions réelles) et `USER_ALERTS` (événements critiques). Nécessite une file d’événements en sortie de base ou d’un broker.

---

## Priorité 2 — Dashboard

### `GET /api/v1/dashboard/summary`
- **Description** : fournit la synthèse affichée sur l’écran principal.
- **Headers** : `Authorization`
- **Query** : `include[]=nutrition&include[]=activity` (optionnel).
- **Réponse 200** :

```json
{
  "glucose": {
    "value": 95,
    "unit": "mg/dL",
    "trend": "flat",
    "recordedAt": "2025-10-31T08:00:00Z"
  },
  "alerts": [
    {
      "alertId": "uuid",
      "type": "hypoglycemia",
      "severity": "critical"
    }
  ],
  "medication": {
    "nextDose": {
      "name": "Metformin",
      "scheduledAt": "2025-10-31T09:00:00Z",
      "status": "pending"
    }
  },
  "nutrition": {
    "calories": {
      "consumed": 1200,
      "goal": 1800
    }
  },
  "activity": {
    "steps": {
      "value": 3500,
      "goal": 8000
    }
  },
  "healthScore": 78
}
```

- **Persistance** : agrégation multi-tables (`GLYCEMIA`, `USER_ALERTS`, `USER_MEDICATIONS`, `USERS_MEALS`, `USER_ACTIVITY`). Prévoir des vues matérialisées ou un service d’agrégation.

### `GET /api/v1/dashboard/widgets`
- **Description** : renvoie la liste des widgets et leurs métadonnées.
- **Headers** : `Authorization`
- **Réponse 200** :

```json
{
  "widgets": [
    {
      "widgetId": "glucose_live",
      "title": "Glucose Live",
      "lastUpdated": "2025-10-31T08:00:00Z",
      "refreshInterval": 300,
      "visible": true
    }
  ]
}
```

- **Persistance** : table à créer `USER_WIDGETS` (colonnes `user_id`, `widget_id`, `visible`, `refresh_interval`, `last_refreshed_at`).

### `PATCH /api/v1/dashboard/widgets/layout`
- **Description** : sauvegarde ordre, taille et épingles.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "layout": [
    {
      "widgetId": "glucose_live",
      "column": 0,
      "row": 0,
      "size": "expanded",
      "pinned": true
    },
    {
      "widgetId": "medications",
      "column": 1,
      "row": 0,
      "size": "compact",
      "pinned": false
    }
  ]
}
```

- **Réponse 200** : structure identique + champs `updatedAt`.
- **Erreurs** : `400` layout invalide.
- **Persistance** : table `USER_WIDGET_LAYOUTS` (à créer) stockant la configuration (`user_id`, `widget_id`, `position`, `size`, `pinned`).

---

## Priorité 3 — Alertes avancées & actions rapides

### `POST /api/v1/glucose/alerts/snooze`
- **Description** : met une alerte en pause temporaire.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "alertId": "uuid",
  "duration": 900,
  "reason": "Currently treating"
}
```

- **Réponse 200** :

```json
{
  "alertId": "uuid",
  "state": "snoozed",
  "snoozeUntil": "2025-10-31T06:30:00Z"
}
```

- **Erreurs** : `403` (alerte critique non snoozable).
- **Persistance** : mise à jour de `USER_ALERTS` (`statut`, `snooze_until`) et insertion dans une table de suivi des actions (`ALERT_ACTION_LOG` à créer).

### `POST /api/v1/glucose/alerts/escalate`
- **Description** : escalade vers contact d’urgence.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "alertId": "uuid",
  "contactId": "uuid",
  "message": "No response detected, please check."
}
```

- **Réponse 202** :

```json
{
  "alertId": "uuid",
  "escalationId": "uuid",
  "status": "pending"
}
```

- **Persistance** : tables `CONTACT` (destinataire), `USER_ALERTS` (statut) et journal `ALERT_ACTION_LOG`.

### `POST /api/v1/dashboard/actions/quick`
- **Description** : déclenche une action guidée depuis le dashboard.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "action": "treat_hypo",
  "context": {
    "alertId": "uuid",
    "value": 55,
    "unit": "mg/dL"
  }
}
```

- **Réponse 202** :

```json
{
  "action": "treat_hypo",
  "status": "processing",
  "nextSteps": [
    "Consume 15g fast carbs",
    "Measure again in 15 minutes"
  ]
}
```

- **Persistance** : journal des actions utilisateur (table `DASHBOARD_ACTIONS` à créer) + enregistrement dans `USER_ALERTS` si suivi hypo.

---

## Priorité 4 — Médicaments

### `GET /api/v1/medications/schedule`
- **Description** : prochaines prises (max 3).
- **Headers** : `Authorization`
- **Réponse 200** :

```json
{
  "upcoming": [
    {
      "scheduledDoseId": "uuid",
      "medicationId": "uuid",
      "name": "Metformin",
      "dose": "500mg",
      "scheduledAt": "2025-10-31T09:00:00Z",
      "status": "pending",
      "countdownSeconds": 1800,
      "isDelayed": false
    }
  ]
}
```

- **Persistance** : tables `USER_MEDICATIONS` (colonnes `user_id`, `medication_id`, `start_date`, `taken_at`, `statut`) et `MEDICATIONS` (infos produit). Ajouter `scheduled_at`, `stock_quantity`.

### `POST /api/v1/medications/intake`
- **Description** : confirme ou modifie le statut d’une prise.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "scheduledDoseId": "uuid",
  "status": "taken",
  "takenAt": "2025-10-31T09:05:00Z",
  "notes": "After breakfast"
}
```

- **Réponse 200** :

```json
{
  "scheduledDoseId": "uuid",
  "status": "taken",
  "takenAt": "2025-10-31T09:05:00Z",
  "observanceRate24h": 0.95
}
```

- **Persistance** : mise à jour `USER_MEDICATIONS` (`taken_at`, `statut`), recalcul observance via vue matérialisée.

### `POST /api/v1/medications/intake/{scheduledDoseId}/reschedule`
- **Description** : décale une prise.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "delayMinutes": 30,
  "reason": "Meeting running late"
}
```

- **Réponse 200** :

```json
{
  "scheduledDoseId": "uuid",
  "status": "rescheduled",
  "scheduledAt": "2025-10-31T09:30:00Z"
}
```

- **Persistance** : même table `USER_MEDICATIONS` (ajouter colonnes `scheduled_at`, `reschedule_reason`).

### `GET /api/v1/medications/stock`
- **Description** : surveille les stocks restants.
- **Headers** : `Authorization`
- **Réponse 200** :

```json
{
  "medications": [
    {
      "medicationId": "uuid",
      "name": "Insulin Lispro",
      "unitsRemaining": 300,
      "daysOfSupply": 6,
      "stockStatus": "critical",
      "projectedDepletionDate": "2025-11-05"
    }
  ]
}
```

- **Persistance** : `USER_MEDICATIONS` (suivi individuel) + table `MEDICATION_STOCK` à créer (niveaux de stock, alertes).

---

## Priorité 5 — Nutrition & Activité

### `GET /api/v1/nutrition/summary`
- **Description** : bilan nutritionnel du jour.
- **Headers** : `Authorization`
- **Réponse 200** :

```json
{
  "calories": {
    "consumed": 1200,
    "goal": 1800
  },
  "carbs": {
    "grams": 150,
    "goal": 200
  },
  "macros": {
    "protein": 60,
    "fat": 40,
    "carbs": 150
  },
  "hydration": {
    "glasses": 5,
    "goal": 8
  }
}
```

- **Persistance** : tables `USERS_MEALS` (dates `taken_at`) et `MEALS` (nutriments). Ajouter champs `calories`, `glucides`, `lipides`, `proteines`, `hydration_glasses`.

### `GET /api/v1/activity/today`
- **Description** : résumé activité quotidienne.
- **Headers** : `Authorization`
- **Réponse 200** :

```json
{
  "steps": {
    "value": 3500,
    "goal": 8000
  },
  "activeMinutes": 45,
  "caloriesBurned": 420,
  "heartRate": {
    "current": 90,
    "zone": "moderate"
  }
}
```

- **Persistance** : tables `USER_ACTIVITY` (colonnes `start`, `end`, `activity_id`) et `ACTIVITIES` (calories, durée recommandée). Ajouter compteur `steps` via intégration wearable.

---

## Priorité 6 — Agrégats glycémie & rapports

### `GET /api/v1/glucose/aggregates`
- **Description** : métriques TIR/TAR/TBR, moyenne, CV, GMI.
- **Headers** : `Authorization`
- **Query** : `period=daily|weekly`, `start`
- **Réponse 200** :

```json
{
  "period": "daily",
  "startDate": "2025-10-30",
  "endDate": "2025-10-30",
  "metrics": {
    "tir": 0.72,
    "tar": 0.20,
    "tbr": 0.08,
    "average": 145,
    "unit": "mg/dL",
    "cv": 0.34,
    "gmi": 6.9
  }
}
```

- **Persistance** : calculs effectués sur `GLYCEMIA_HISTO` et `GLYCEMIA_DATA&IA` (zones d’hyper/hypo). Créer vues/ETL pour métriques cliniques.

### `GET /api/v1/analytics/reports/agp`
- **Description** : export AGP (job asynchrone).
- **Headers** : `Authorization`
- **Query** : `rangeStart`, `rangeEnd`, `format=pdf|csv`
- **Réponse 202** :

```json
{
  "jobId": "uuid",
  "status": "processing",
  "estimatedReadyAt": "2025-10-31T09:10:00Z"
}
```

- **Polling** : `GET /api/v1/analytics/reports/agp/{jobId}` →

```json
{
  "jobId": "uuid",
  "status": "ready",
  "downloadUrl": "https://..."
}
```

- **Persistance** : génération à partir de `GLYCEMIA_HISTO`, stockage temporaire dans `REPORT_JOBS`.

---

## Priorité 7 — Capteurs & Prédictions

### `GET /api/v1/devices/sensors`
- **Description** : état des capteurs connectés.
- **Headers** : `Authorization`
- **Réponse 200** :

```json
{
  "sensors": [
    {
      "sensorId": "dexcom_g7_001",
      "type": "dexcom_g7",
      "status": "connected",
      "battery": 70,
      "expiresAt": "2025-11-05T12:00:00Z",
      "lastCalibration": "2025-10-30T08:00:00Z"
    }
  ]
}
```

- **Persistance** : table `SENSORS` à créer (`sensor_id`, `user_id`, `type`, `status`, `battery`, `expires_at`, `last_calibration`).

### `POST /api/v1/devices/sensors/{sensorId}/calibrations`
- **Description** : enregistre une calibration.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "referenceValue": 110,
  "unit": "mg/dL",
  "recordedAt": "2025-10-31T07:50:00Z",
  "stepsCompleted": [
    "wash_hands",
    "finger_prick",
    "enter_value"
  ]
}
```

- **Réponse 201** :

```json
{
  "calibrationId": "uuid",
  "sensorId": "dexcom_g7_001",
  "status": "success",
  "recordedAt": "2025-10-31T07:52:10Z"
}
```

- **Persistance** : table `SENSOR_CALIBRATIONS` (`sensor_id`, `user_id`, `reference_value`, `recorded_at`, `status`).

### `GET /api/v1/glucose/predictions`
- **Description** : prévisions à court terme.
- **Headers** : `Authorization`
- **Query** : `window=30|60`
- **Réponse 200** :

```json
{
  "window": 30,
  "unit": "minutes",
  "probabilities": {
    "hypoglycemia": 0.22,
    "hyperglycemia": 0.05
  },
  "projectedValues": {
    "min": 72,
    "median": 95,
    "max": 130,
    "unit": "mg/dL"
  },
  "recommendations": [
    {
      "type": "carbs",
      "value": "10g fast carbs",
      "reason": "Downward trend"
    }
  ],
  "predictionId": "uuid",
  "confidence": 0.81
}
```

- **Persistance** : stockage des prédictions dans `GLYCEMIA_DATA&IA` (`user_id`, `measured_at`, `prediction_window`, `prob_hypo`, `prob_hyper`, `recommendation`).

### `POST /api/v1/glucose/predictions/feedback`
- **Description** : feedback utilisateur pour affiner les modèles.
- **Headers** : `Authorization`, `Content-Type`
- **Body** :

```json
{
  "predictionId": "uuid",
  "outcome": "accurate",
  "userAction": "took_carbs"
}
```

- **Réponse 204** : pas de contenu.
- **Persistance** : table `PREDICTION_FEEDBACK` (à créer) pour améliorer les modèles.

---

## Gestion générique des erreurs & limites

- `400` Bad Request (ex. valeur hors plage)
- `401` Unauthorized (token expiré)
- `403` Forbidden (scope insuffisant)
- `404` Not Found (ressource absente)
- `409` Conflict (règle métier violée)
- `429` Too Many Requests (inclure `Retry-After`)
- Limites recommandées : 60 écritures/min/utilisateur, 600 lectures/min, 30 messages/s WebSocket

---

## Prochaines étapes suggérées

1. Implémenter les priorités 0 et 1 pour constituer le socle sécurisé du suivi glycémique.
2. Exposer le `dashboard/summary` et les actions rapides (priorités 2 & 3).
3. Étendre progressivement avec les modules médicaments, nutrition et activité.
4. Ajouter les agrégats, exports, maintenance capteur et prédictions selon la roadmap.
5. Générer un schéma OpenAPI à partir de cette documentation pour faciliter les tests et l’intégration.


