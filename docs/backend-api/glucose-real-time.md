# Glycémie temps réel & historique

Ce module couvre F03.1, F03.2 et la base du système d’alertes F03.3. Il fournit les APIs nécessaires au suivi continu de la glycémie et à l’historisation des mesures.

## Contexte fonctionnel

- **Cas d’usage CU03.1** : consultation temps réel depuis l’application ou le widget.
- **Cas d’usage CU03.2 (partiellement)** : déclenchement initial d’alerte hypo.
- Intégration avec capteurs CGM (Dexcom G6/G7, FreeStyle Libre) + saisies manuelles.

## Tables MPC & évolutions

| Table | Rôle | Colonnes à ajouter |
| --- | --- | --- |
| `GLYCEMIA` | Dernières mesures (temps réel) | `reading_id` (uuid), `source`, `context`, `trend`, `rate`, `notes`, `photo_url`, `location_lat`, `location_lng` |
| `GLYCEMIA_HISTO` | Historique complet | mêmes colonnes que `GLYCEMIA` + `ingested_at` |
| `GLYCEMIA_DATA&IA` | Données enrichies IA | `prediction_window`, `prob_hypo`, `prob_hyper`, `recommendation` |
| `USER_ALERTS` + `ALERTS` | Déclenchements d’alertes | `status` (enum), `snooze_until`, `acknowledged_at`, `source_reading_id` |
| `SENSORS` (nouveau) | État du capteur CGM | `sensor_id`, `user_id`, `type`, `status`, `battery`, `signal_quality`, `expires_at`, `last_calibration` |

### Contrôle d’accès spécifique

- **Patient** : toutes les requêtes filtrent sur `user_id = request.user.id` (lectures & créations).
- **Doctor** : utiliser une jointure sur `USERS.medical_id` ou table d’assignation (`DoctorAssignment`) pour restreindre aux patients suivis. Retourner `404` si l’accès est hors périmètre.
- **Admin** : accès complet, mais journaliser chaque action d’écriture (`audit_logs`).

## Endpoints REST

### `POST /api/v1/glucose/manual-readings`

- **Rôles autorisés** : `patient` (écriture), `doctor` (lecture via endpoints GET), `admin` (supervision).
- **Objectif** : Saisie manuelle (ou import lecteur Bluetooth) pour corriger/comparer avec CGM.
- **Headers** : `Authorization`, `Content-Type`, `X-Idempotency-Key` (UUID). 
- **Body** :
  ```json
  {
    "value": 110,
    "unit": "mg/dL",
    "context": "preprandial",
    "recordedAt": "2025-10-31T07:45:00Z",
    "notes": "Before breakfast",
    "photoUrl": null,
    "location": { "lat": 48.8566, "lng": 2.3522 }
  }
  ```
- **Règles métier** :
  - Valeur 20–600 mg/dL (1.1–33.3 mmol/L).
  - Minimum 15 min entre deux saisies manuelles.
  - Maximum 20 saisies/jour.
  - Contexte ∈ {`fasting`, `preprandial`, `postprandial_1h`, `postprandial_2h`, `bedtime`, `exercise`, `stress`, `correction`}. 
- **Traitements** :
  - Insérer dans `GLYCEMIA` (courant) + `GLYCEMIA_HISTO` (historique).
  - Déclencher recalcul `GLYCEMIA_DATA&IA` (optionnel) + évaluations alertes.
  - Conserver `reading_id` pour audit.
- **Réponse 201** : renvoyer lecture enrichie (`trend`, `rates`, `source=manual`).
- **Erreurs** : `400` (plage), `409` (quota), `422` (ordre temps), `429` (doublon idempotent).

### `GET /api/v1/glucose/current`

- **Rôles autorisés** : `patient`, `doctor`, `admin`.
- **Objectif** : Dernière valeur connue + métadonnées capteur.
- **Réponse 200** :
  ```json
  {
    "readingId": "uuid",
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
      "signalQuality": "good",
      "expiresAt": "2025-11-05T12:00:00Z"
    }
  }
  ```
- **Persistance** : jointure `GLYCEMIA` + `SENSORS` (fallback si capteur déconnecté).
- **Exceptions** : `404` si aucun capteur configuré.

### `GET /api/v1/glucose/history`

- **Rôles autorisés** : `patient`, `doctor`, `admin` (docteur uniquement pour patients associés).
- **Query** : `start`, `end`, `granularity=5m|15m|1h`, `source=cgm|manual|all`.
- **Réponse 200** :
  ```json
  {
    "entries": [ { "readingId": "uuid", "value": 120, "trend": "rising", ... } ],
    "nextCursor": null
  }
  ```
- **Traitements** :
  - Interroger `GLYCEMIA_HISTO` avec agrégation selon `granularity`.
  - Inclure marqueurs (`mealId`, `medicationId`, `activityId`) si disponibles pour graphiques.
- **Optimisation** : index `(user_id, measured_at)`, partition mensuelle recommandée.

### `GET /api/v1/glucose/alerts`

- **Rôles autorisés** : `patient`, `doctor`, `admin` (le docteur ne peut voir que les alertes de ses patients).
- **Usage** : Liste des alertes en attente/traitées.
- **Query** : `state=pending|acknowledged|snoozed|escalated`, `severity`, `since`.
- **Réponse 200** :
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
        "status": "pending"
      }
    ]
  }
  ```
- **Persistance** : jointure `USER_ALERTS` ↔ `ALERTS`, colonnes `status`, `snooze_until`, `acknowledged_at`.

### `POST /api/v1/glucose/alerts/{alertId}/acknowledge`

- **Rôles autorisés** : `patient` (principal), `doctor` (si délégué), `admin` (en cas de assistance).
- **Body** : `{ "action": "treated", "notes": "15g carbs", "followUpAt": "2025-10-31T06:30:00Z" }`
- **Traitements** : mettre à jour `USER_ALERTS.status=acknowledged`, renseigner `acknowledged_at`, créer entrée dans `ALERT_ACTION_LOG`.

## WebSocket `/api/v1/streams/glucose`

- **Topics** :
  - `glucose.live` → nouvelles lectures temps réel (toutes les 5 min ou saisir manuelle).
  - `alerts.critical` → alertes hypo/hyper instantanées.
- **Message d’abonnement** : `{ "type": "subscribe", "topic": "glucose.live", "sensorId": "dexcom_g7_001" }`
- **Payload mesure** :
  ```json
  {
    "type": "glucose_live",
    "payload": {
      "readingId": "uuid",
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
- **Persistence** : chaque message provient d’une insertion `GLYCEMIA` ou d’un recalcul `GLYCEMIA_DATA&IA`. Les alertes utilisent `USER_ALERTS`.
- **Gestion d’erreurs** : message `{ "type": "error", "code": "sensor_disconnected", ... }` si capteur offline.

## Processus d’ingestion CGM

1. Service d’intégration capteur reçoit la donnée (BLE ou API partenaire).
2. Normalisation unité (mg/dL) et conversion mmHg → mg/dL si nécessaire.
3. Insertion dans `GLYCEMIA` + duplication `GLYCEMIA_HISTO`.
4. Évaluation alertes (comparaison seuils, variation > 2 mg/dL/min, prédiction hazard).
5. Publication WebSocket + déclenchement notifications push.

## Tests & monitoring

- **Unitaires** : validations sérialiseurs (plages, contexte, idempotence).
- **Intégration** :
  - Pipeline complet : insertion capteur → WebSocket → `GET /glucose/current`.
  - CU03.1 : `GET /glucose/history` sur 90 jours (performance + pagination).
- **Charge** : tests WebSocket (JMeter ou k6) sur 10 000 messages/h.
- **Monitoring** : métriques `glucose_ingest_latency`, `glucose_ws_delivery_latency`, `alerts_triggered_total`, `manual_entry_conflict_total`.

## Décisions & TODOs

- Choisir la librairie d’accès CGM : Dexcom official API (OAuth), FreeStyle Libre (BLE). Nécessite adaptateurs distincts.
- Stocker `location` uniquement si consentement (global GDPR/ CNIL) → ajouter flag `location_opt_in` dans `USERS`.
- Prévoir un job nocturne qui purge `GLYCEMIA` (keep last 3 jours) tout en conservant l’historique complet dans `GLYCEMIA_HISTO`.

