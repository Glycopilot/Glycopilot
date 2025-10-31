# Nutrition & Activité

Fonctionnalités issues de F02.4 (widget nutrition dynamique) et F02.5 (activité & exercice). Sert principalement à nourrir le dashboard et les rapports.

## Tables MPC & ajouts

| Domaine | Tables | Ajouts |
| --- | --- | --- |
| Nutrition | `MEALS`, `USERS_MEALS` | Ajouter `calories`, `carbs`, `proteins`, `fats`, `hydration_glasses`, `impact_glucose_estimated` dans `MEALS`. `USERS_MEALS` doit stocker `taken_at`, `portion`, `notes`, `context`. |
| Activité | `ACTIVITIES`, `USER_ACTIVITY` | Ajouter `steps`, `intensity`, `calories_burned`, `heart_rate_avg`, `source` (`wearable`, `manual`). Indiquer `start`, `end`, `synced_at`. |

### Contrôle d’accès spécifique

- **Patient** : requêtes filtrées par `user_id = request.user.id`.
- **Doctor** : lecture des données nutrition/activité limitée aux patients suivis ; pas de modifications.
- **Admin** : peut saisir manuellement des activités/repas pour assistance (log obligatoire).

## Endpoints

### `GET /api/v1/nutrition/summary`

- **Rôles autorisés** : `patient`, `doctor` (lecture), `admin`.
- **Objectif** : fournir les métriques quotidiennes pour le dashboard et la page nutrition.
- **Réponse 200** :
  ```json
  {
    "calories": { "consumed": 1200, "goal": 1800 },
    "carbs": { "grams": 150, "goal": 200 },
    "macros": { "protein": 60, "fat": 40, "carbs": 150 },
    "hydration": { "glasses": 5, "goal": 8 },
    "lastMeal": {
      "name": "Lunch",
      "takenAt": "2025-10-31T12:30:00Z",
      "glucoseImpact": "+18 mg/dL"
    }
  }
  ```
- **Logique** :
  - Summation des repas du jour (`USERS_MEALS` group by).
  - Objectifs nutritionnels depuis profil (à stocker dans `USERS` ou table `USER_GOALS`).
  - `glucoseImpact` calculé via corrélation mesure (GLYCEMIA) ± 2 h.
- **Options** : `?range=7d` pour bilan hebdo (retourner moyenne/jour).

### `GET /api/v1/activity/today`

- **Rôles autorisés** : `patient`, `doctor` (lecture), `admin`.
- **Réponse 200** :
  ```json
  {
    "steps": { "value": 3500, "goal": 8000 },
    "activeMinutes": 45,
    "caloriesBurned": 420,
    "heartRate": { "current": 90, "zone": "moderate" },
    "sessions": [
      {
        "activityId": "uuid",
        "name": "Morning walk",
        "start": "2025-10-31T06:30:00Z",
        "end": "2025-10-31T07:00:00Z",
        "steps": 2500,
        "intensity": "light"
      }
    ]
  }
  ```
- **Logique** :
  - `steps` cumulés depuis `USER_ACTIVITY` + sources wearables (Apple Health/Google Fit).
  - `goal` stocké dans table `USER_GOALS` (nouvelle) ou `USERS`.
  - `heartRate` peut provenir directement du dernier sample wearable (table `HEART_RATE_LOGS` à créer si besoin).

### `POST /api/v1/activity/manual-entry`

- **Rôles autorisés** : `patient`, `admin` (mise à jour de suivi). Les docteurs ne peuvent pas saisir d’activité pour le patient.
- **Usage** : enregistrer une activité non synchronisée automatiquement.
- **Body** : `{ "name": "Yoga", "start": "2025-10-31T18:00:00Z", "end": "2025-10-31T18:45:00Z", "caloriesBurned": 180, "intensity": "moderate" }`
- **Persistance** : insertion dans `USER_ACTIVITY` (`source="manual"`).

### `GET /api/v1/nutrition/recommendations`

- **Rôles autorisés** : `patient`, `doctor`, `admin`.
- **Paramètres** : `timeOfDay`, `glucoseState` (`low`, `in_range`, `high`), `activityPlanned` (bool).
- **Réponse** : liste de suggestions (`mealId`, `name`, `carbs`, `description`, `glucoseImpactEstimate`).
- **Source** : moteur de recommandations (peut s’appuyer sur `MEALS` + IA simple). Pour MVP, renvoyer suggestions statiques basées sur `glucoseState`.

### `GET /api/v1/activity/recommendations`

- **Rôles autorisés** : `patient`, `doctor`, `admin`.
- **Paramètres** : `glucoseState`, `lastMeal`, `timeAvailable`.
- **Réponse** : propositions d’exercices adaptés (`activityId`, `name`, `duration`, `caloriesTarget`, `warning` si glycémie trop basse).

## Intégrations externes

- **Apple Health / Google Fit** : utiliser webhooks ou synchronisation périodique pour mettre à jour `USER_ACTIVITY` et `HEART_RATE_LOGS`.
- **Journal alimentaire** : possibilité de connecter Yazio / MyFitnessPal (future intégration).

## Tests

- **Unitaires** :
  - Calcul nutrition (`consumed`, `goal`, `hydration`).
  - Calcul activité (steps, minutes, zone cardiaque).
- **Intégration** :
  - Import wearable → `GET /activity/today`.
  - Enregistrement repas manuel → `GET /nutrition/summary` mise à jour.
- **E2E** : vérifier que le dashboard reflète en <5 min les nouvelles entrées nutrition/activité.

## Monitoring

- `nutrition_entries_total`, `activity_sessions_synced_total`.
- `recommendation_response_ms` pour s’assurer de la réactivité.

## Hypothèses

- Les objectifs (`goal`) seront configurables via un futur module de paramètres. Pour l’instant, on peut utiliser des valeurs par défaut (ex. 1800 kcal, 8 verres, 8000 pas) avec surcharge possible via `PATCH /user/preferences`.
- Les suggestions nutrition/activité peuvent être simplifiées dans V1 (règles heuristiques) avant l’arrivée du moteur IA.

