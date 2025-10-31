# Dashboard principal

Module couvrant F02 (Dashboard) et cas d’usage CU02.1 (consultation matinale) ainsi que CU02.3 (personnalisation).

## Objectifs métier

- Fournir en < 1,5 s un aperçu complet de la glycémie, des alertes, des médicaments, de la nutrition et de l’activité.
- Permettre à l’utilisateur de personnaliser l’agencement et la taille des widgets selon ses besoins.
- Supporter les modes adaptatifs (portrait, paysage, urgence) via configuration côté backend.

## Tables et structures

| Table | Description | Champs clés / à créer |
| --- | --- | --- |
| `USER_WIDGETS` (nouveau) | Liste des widgets activés pour un utilisateur | `user_id`, `widget_id`, `visible`, `refresh_interval`, `last_refreshed_at` |
| `USER_WIDGET_LAYOUTS` (nouveau) | Position et taille des widgets | `user_id`, `widget_id`, `column`, `row`, `size`, `pinned` |
| `USER_ALERTS`, `USER_MEDICATIONS`, `USERS_MEALS`, `USER_ACTIVITY` | Sources de données agrégées | lecture |
| Services agrégés | Fonctions Python pour chaque bloc | exposition API |

### Contrôle d’accès spécifique

- **Patient** : `GET /dashboard/*` doit retourner uniquement les données liées à `request.user.id`.
- **Doctor** : accès lecture aux patients suivis (filtrage par `medical_id` ou table d’assignation). Si patient non suivi → `404`.
- **Admin** : actions de personnalisation effectuées au nom du patient doivent être loguées (`DASHBOARD_ACTIONS`, `audit_logs`).

## Endpoints

### `GET /api/v1/dashboard/summary`

- **Rôles autorisés** : `patient`, `doctor` (lecture), `admin`.
- **Usage** : alimenter l’écran d’accueil en 800 ms max.
- **Query facultative** : `include[]=nutrition&include[]=activity` (sinon tous les modules).
- **Réponse 200** :
  ```json
  {
    "glucose": { "value": 95, "unit": "mg/dL", "trend": "flat", "recordedAt": "..." },
    "alerts": [ { "alertId": "uuid", "type": "hypoglycemia", "severity": "critical" } ],
    "medication": {
      "nextDose": {
        "name": "Metformin",
        "scheduledAt": "2025-10-31T09:00:00Z",
        "status": "pending"
      }
    },
    "nutrition": {
      "calories": { "consumed": 1200, "goal": 1800 },
      "carbs": { "grams": 150, "goal": 200 }
    },
    "activity": {
      "steps": { "value": 3500, "goal": 8000 },
      "activeMinutes": 45
    },
    "healthScore": 78
  }
  ```
- **Agrégations** :
  - `glucose` → lecture `GLYCEMIA` / `GLYCEMIA_DATA&IA`.
  - `alerts` → `USER_ALERTS` (top 3 critiques).
  - `medication` → `USER_MEDICATIONS` (prochaine prise).
  - `nutrition` → `USERS_MEALS` / `MEALS`, dernière 24 h.
  - `activity` → `USER_ACTIVITY`, jour en cours.
  - `healthScore` → formule composite (possibilité d’utiliser pondération configurable).
- **Performance** : utiliser either vues matérialisées ou service python avec requêtes parallèles (async) + cache court (30 s) quand cohérent.

### `GET /api/v1/dashboard/widgets`

- **Rôles autorisés** : `patient`, `doctor` (lecture seule), `admin`.
- **Usage** : construire les écrans de personnalisation.
- **Réponse 200** :
  ```json
  {
    "widgets": [
      {
        "widgetId": "glucose_live",
        "title": "Glucose Live",
        "lastUpdated": "2025-10-31T08:00:00Z",
        "refreshInterval": 300,
        "visible": true
      },
      {
        "widgetId": "medications",
        "title": "Medications",
        "lastUpdated": "2025-10-31T07:30:00Z",
        "refreshInterval": 300,
        "visible": true
      }
    ]
  }
  ```
- **Persistance** : lecture `USER_WIDGETS`; fallback aux valeurs par défaut si pas de config.
- **Business** : certains widgets toujours visibles (`glucose_live` en mode urgence).

### `PATCH /api/v1/dashboard/widgets/layout`

- **Rôles autorisés** : `patient` (personnalisation personnelle), `admin` (support). Les docteurs n’ont pas accès à la personnalisation d’un patient.
- **Body** :
  ```json
  {
    "layout": [
      { "widgetId": "glucose_live", "column": 0, "row": 0, "size": "expanded", "pinned": true },
      { "widgetId": "medications", "column": 1, "row": 0, "size": "compact", "pinned": false }
    ]
  }
  ```
- **Validations** :
  - `widgetId` doit exister dans le catalogue (`WidgetCatalog` en config).
  - `column`, `row` ≥ 0 ; `size` ∈ {`compact`, `normal`, `expanded`}.
  - Limiter à 10 widgets max (performances mobile).
- **Persistance** : upsert `USER_WIDGET_LAYOUTS` + mise à jour `USER_WIDGETS.visible` si un widget disparaît.
- **Réponse 200** : layout stocké + `updatedAt`.
- **Effets** : déclencher évènement `dashboard.refresh` sur WebSocket pour recharger le front.

## Services annexes

- `health_score_service.py` : calcule le score 0–100 (pondération glycémie 40 %, observance 20 %, nutrition 20 %, activité 20 %).
- `widget_catalog.py` : défini les widgets disponibles, contraintes (ex. `glucose_live` non masquable).
- `dashboard_cache.py` : gère cache par utilisateur (clef `dashboard:summary:<user_id>`).

## Tests & validations

- **Unitaires** :
  - services d’agrégation (s’assurer des arrondis, conversions unités).
  - sérialiseur layout (détection collisions, colonnes négatives).
- **Intégration** :
  - scenario CU02.1 complet (API + front) : ouverture dashboard → réponse en < 800 ms.
  - personnalisation (CU02.3) : patch layout → relecture `GET /dashboard/widgets` → rechargement front.
- **Performance** : tests de charge sur `GET /dashboard/summary` (1000 req/min), vérifier cache.

## Hypothèses

- Le mode urgence (affichage glycémie seul) sera géré côté front avec un paramètre `?mode=emergency`. Le backend n’expose qu’un widget filtré (à confirmer).
- Les recommandations IA (nutrition/sport) sont récupérées via modules respectifs ; ce fichier se limite à l’agrégation.

