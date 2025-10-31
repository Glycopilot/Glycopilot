# Médicaments intelligents

Module lié à F02.3 (widget médicaments) et support des alertes d’observance.

## Objectifs

- Présenter les trois prochaines prises avec compte à rebours et statut.
- Permettre la confirmation (prise, retard, oubli) et replanifier une prise.
- Suivre le stock et prédire la date de rupture.

## Tables & évolutions

| Table | Ajouts nécessaires |
| --- | --- |
| `MEDICATIONS` | colonnes `dosage`, `type`, `interval_h`, `max_duration_d`, `photo_url` |
| `USER_MEDICATIONS` | ajouter `scheduled_dose_id` (uuid), `scheduled_at`, `taken_at`, `status` enum (`pending`, `taken`, `delayed`, `skipped`), `delay_reason`, `notes`, `observance_window` |
| `MEDICATION_STOCK` (nouvelle) | `id`, `user_id`, `medication_id`, `quantity_unit`, `units_remaining`, `days_of_supply`, `projected_depletion_date`, `threshold_warning`, `threshold_critical`, `updated_at` |

### Contrôle d’accès spécifique

- **Patient** : accès complet mais uniquement à ses propres traitements (`user_id = request.user.id`).
- **Doctor** : lecture des plannings/stocks pour patients suivis ; pas de `POST` (sauf workflow télémédecine défini ultérieurement).
- **Admin** : peut effectuer des actions pour assistance, avec journalisation (`DASHBOARD_ACTIONS`, `audit_logs`).

## Endpoints

### `GET /api/v1/medications/schedule`

- **Rôles autorisés** : `patient`, `doctor` (lecture), `admin`.
- **Réponse 200** :
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
- **Logique** :
  - Filtrer sur fenêtre [maintenant, +24 h].
  - Calculer `countdownSeconds` et `isDelayed` (prise dépassée > 30 min).
  - Ajouter badge `overdueLevel` (`none`, `minor`, `critical`).

### `POST /api/v1/medications/intake`

- **Rôles autorisés** : `patient`, `admin` (mode assistance). `doctor` peut confirmer une prise uniquement via workflow télémédecine (à définir).
- **Body** : `{ "scheduledDoseId": "uuid", "status": "taken", "takenAt": "2025-10-31T09:05:00Z", "notes": "After breakfast" }`
- **Validations** :
  - `status` ∈ {`taken`, `delayed`, `skipped`}.
  - `takenAt` ± 2 h autour de `scheduledAt` (sinon log `delay_reason`).
  - Empêcher double confirmation (idempotence via `scheduledDoseId`).
- **Traitements** :
  - Update `USER_MEDICATIONS.status`, `taken_at`.
  - Calculer observance 24 h/7 jours (stocké dans une vue ou table dérivée `medication_adherence`).
  - Si `taken` → décrémenter `MEDICATION_STOCK.units_remaining`.
- **Réponse 200** : statut mis à jour + `observanceRate24h`.

### `POST /api/v1/medications/intake/{scheduledDoseId}/reschedule`

- **Rôles autorisés** : `patient`, `admin`.
- **Body** : `{ "delayMinutes": 30, "reason": "Meeting running late" }`
- **Règles** :
  - Autoriser délais de 15, 30, 60 min ; autres valeurs → `400`.
  - Maximum 2 reports consécutifs pour la même dose.
- **Traitements** : mettre à jour `scheduled_at`, `status=delayed`, enregistrer `delay_reason`.

### `GET /api/v1/medications/stock`

- **Rôles autorisés** : `patient`, `doctor`, `admin`.
- **Réponse 200** :
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
- **Traitements** :
  - Calcul `daysOfSupply = unitsRemaining / dailyUsage`.
  - `stockStatus` : `ok` (>10 j), `warning` (≤10 j), `critical` (≤7 j).
  - Déclencher alerte (notification) si `critical`.

## Processus de génération du planning

1. Importer l’ordonnance (médicament, dosage, fréquence) via backoffice ou API.
2. Générer les occurrences `scheduled_dose_id` pour la période active (ex. 30 jours).
3. À chaque jour, recalculer les créneaux futurs (tâche planifiée).
4. Synchroniser avec le widget Dashboard.

## Tests & QA

- **Unitaires** :
  - Calcul `countdownSeconds`, `daysOfSupply`, observance.
  - Validation des reports.
- **Intégration** :
  - Cycle complet : `schedule` → `intake` → `stock`.
  - Cas retard > 2 h → statut `delayed` + badge.
- **E2E** : simulateur CU02.1 (confirmation prise matinale depuis dashboard) + CU03.2 (alerte retard).

## Hypothèses

- L’import ordonnances (création initiale `USER_MEDICATIONS`) sera géré par un backoffice ou un endpoint administrateur (hors périmètre immédiat).
- Les stocks sont décrémentés à chaque prise confirmée et peuvent aussi être mis à jour depuis un scan d’ordonnance (future feature).

