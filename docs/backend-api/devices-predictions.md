# Capteurs & Prédictions IA

Module couvrant F03.6 (calibration & maintenance), F03.5 (analyse prédictive) et F03.7/F03.8 concernant la gestion des situations critiques matérielles.

## Tables et ajouts

| Table | Description | Champs |
| --- | --- | --- |
| `SENSORS` (nouvelle) | Informations capteur CGM | `sensor_id` (uuid), `user_id`, `type`, `status` (`connected`, `disconnected`, `expired`), `battery`, `signal_quality`, `firmware_version`, `paired_at`, `expires_at`, `last_calibration` |
| `SENSOR_CALIBRATIONS` (nouvelle) | Historique calibrations | `calibration_id`, `sensor_id`, `user_id`, `reference_value`, `unit`, `recorded_at`, `status`, `steps_completed`, `notes` |
| `GLYCEMIA_DATA&IA` | Données enrichies | colonnes déjà mentionnées (predictions, recommandations) |
| `PREDICTION_FEEDBACK` (nouvelle) | Retours utilisateur sur l’IA | `id`, `prediction_id`, `user_id`, `outcome`, `user_action`, `recorded_at` |

## Endpoints capteurs

### `GET /api/v1/devices/sensors`

- **Rôles autorisés** : `patient`, `doctor` (lecture), `admin`.
- **Usage** : afficher l’état du capteur dans le widget glycémie.
- **Réponse 200** :
  ```json
  {
    "sensors": [
      {
        "sensorId": "dexcom_g7_001",
        "type": "dexcom_g7",
        "status": "connected",
        "battery": 70,
        "signalQuality": "good",
        "expiresAt": "2025-11-05T12:00:00Z",
        "lastCalibration": "2025-10-30T08:00:00Z"
      }
    ]
  }
  ```
- **Traitements** :
  - Mettre à jour `status` via synchronisation (job horaire) ou webhooks depuis les apps officielles.
  - Calculer `battery` et `expiresAt` selon données fabricant.

### `POST /api/v1/devices/sensors/{sensorId}/calibrations`

- **Rôles autorisés** : `patient`, `admin`. `doctor` peut uniquement consulter l’historique.
- **Body** : `{ "referenceValue": 110, "unit": "mg/dL", "recordedAt": "2025-10-31T07:50:00Z", "stepsCompleted": ["wash_hands", "finger_prick", "enter_value"], "notes": "Calibration morning" }`
- **Validations** :
  - `sensorId` appartient à l’utilisateur.
  - Pas plus de 2 calibrations/jour.
- **Traitements** :
  - Insérer entrée `SENSOR_CALIBRATIONS`.
  - Mettre à jour `SENSORS.last_calibration`.
  - Notifier l’utilisateur du succès/échec.
- **Réponse 201** : calibration enregistrée.

### `POST /api/v1/devices/sensors/{sensorId}/diagnostics`

- **Rôles autorisés** : `patient`, `admin` (support).
- **Usage** : lancer un test de connectivité depuis l’app.
- **Réponse** : rapport (`signalStrength`, `latency`, `recommendation`).
- **Implémentation** : endpoint appelle un service interne (ping capteur, vérifier latence). Peut être stub en V1.

### `POST /api/v1/devices/sensors/{sensorId}/reset`

- **Rôles autorisés** : `patient`, `admin`.
- **Usage** : forcer une réinitialisation (ré-appairage). 
- **Sécurité** : nécessite scope `patient:advanced` ou action confirmée par code.

## Prédictions IA

### `GET /api/v1/glucose/predictions`

- **Rôles autorisés** : `patient`, `doctor`, `admin` (lecture). Les docteurs voient uniquement les patients suivis.
- **Paramètres** : `window=30|60` (minutes).
- **Réponse 200** :
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
      { "type": "carbs", "value": "10g fast carbs", "reason": "Downward trend" }
    ],
    "predictionId": "uuid",
    "confidence": 0.81
  }
  ```
- **Backend** :
  - Appeler le service ML (`POST /ml/predict`) avec features : historique 24 h, repas, insulin, activité, stress, météo.
  - Stocker la réponse dans `GLYCEMIA_DATA&IA` (timestamp = maintenant, `prediction_window` = 30/60).
- **Erreur** : `503` si service IA indisponible → fallback en heuristique simple (tendance rate-of-change).

### `POST /api/v1/glucose/predictions/feedback`

- **Rôles autorisés** : `patient`, `admin` (support). |
- **Body** : `{ "predictionId": "uuid", "outcome": "accurate", "userAction": "took_carbs" }`
- **Traitements** : insertion `PREDICTION_FEEDBACK`. Peut être utilisé en ML pour améliorer modèle.
- **Réponse** : `204 No Content`.

## Protocoles d’urgence (F03.7)

- Si `GLYCEMIA` < 55 mg/dL et aucune réponse en 5 min → envoyer action escalade (cf. `alerts-actions.md`).
- Si < 40 mg/dL → déclencher appel services d’urgence (intégration VOIP ou Twilio).
- Ajout dans `SENSORS` de la détection `inactivity` (optionnel, via wearable) → déclencher `USER_ALERTS` type `loss_of_consciousness`.

## Gestion des pannes (F03.8)

- **Perte connexion capteur** : `SENSORS.status = disconnected`, notification + bascule `mode manual`.
- **Données aberrantes** : validation croisée (comparaison dernière valeur + tendance). Si > 5σ, demander confirmation.
- **Panne serveur** : API renvoie `503` + front passe en mode offline (utiliser données locales 30 jours).
- **Erreur calibration** : renvoyer guide étapes via `SENSOR_CALIBRATIONS` + documentation.

## Tests & monitoring

- **Unitaires** :
  - Validation calibrations (limite quotidienne, steps).
  - Traitement prédictions (mapping features → service ML).
- **Intégration** :
  - Simulation capteur déconnecté → `GET /devices/sensors` → statut.
  - Appel ML indisponible → fallback heuristique (rate-of-change).
- **Monitoring** : `sensor_status{status=connected}`, `prediction_latency_ms`, `prediction_failure_total`.

## Hypothèses

- Le service ML est externe (hébergé sur FastAPI/Tensorflow Serving). Ajouter variable env `ML_PREDICTION_ENDPOINT`.
- Les calibrations suivent le protocole Dexcom/Libre (2 calibrations/24 h max). Les autres dispositifs pourront nécessiter un paramétrage différent (à stocker dans `SENSORS` sous forme JSON `calibration_policy`).

