# Alertes avancées & actions guidées

Ce module complète F03.3 (système d’alertes), F03.7 (protocole d’urgence) et CU03.2 (gestion d’une hypoglycémie), ainsi que F02.2 pour les actions rapides depuis le dashboard.

## Tables et nouvelles structures

| Table | Colonnes existantes | Ajouts / nouvelles tables |
| --- | --- | --- |
| `ALERTS` | `alert_id`, `name`, `glycemia_interval`, `danger_level`, `description` | Ajouter `type` (`hypo_severe`, `hypo`, `hyper`, `rapid_trend`, `prediction`), `default_severity` |
| `USER_ALERTS` | `user_id`, `alert_id`, `sent_at`, `statut` | Remplacer `statut` bool par `status` enum, ajouter `snooze_until`, `acknowledged_at`, `escalation_level`, `follow_up_at`, `source_reading_id` |
| `CONTACT` | contacts d’urgence | Aucun changement |
| `USER_NOTIFICATIONS` | Historique push | Ajouter `channel` (`push`, `sms`, `call`, `wearable`) |
| `ALERT_ACTION_LOG` (nouveau) | Historique des actions | `id`, `user_alert_id`, `action`, `payload`, `created_at`, `actor` |
| `DASHBOARD_ACTIONS` (nouveau) | Log des actions rapides | `id`, `user_id`, `action`, `source`, `metadata`, `created_at` |

### Contrôle d’accès spécifique

- **Patient** : ne manipule que ses propres alertes (`user_id = request.user.id`).
- **Doctor** : consultation des alertes possible seulement pour les patients suivis ; pas de snooze sans délégation explicite.
- **Admin** : actions (`snooze`, `escalate`, `quick action`) doivent inclure `performed_by` dans `ALERT_ACTION_LOG`.

## Règles métier

- Aucun snooze possible pour une hypo sévère (<55 mg/dL) sans override explicite.
- Escalade automatique vers contact d’urgence après 5 min sans réponse pour hypo sévère.
- Les actions déclenchées depuis le dashboard (bouton “Traiter hypoglycémie”) doivent créer une entrée d’audit.

## Endpoints

### `POST /api/v1/glucose/alerts/snooze`

- **Rôles autorisés** : `patient` (principal), `admin` (support). Les docteurs ne peuvent snoozer qu’avec délégation explicite.
- **Body** : `{ "alertId": "uuid", "duration": 900, "reason": "Currently treating" }`
- **Validations** :
  - `duration` ∈ [300 s, 3600 s].
  - Vérifier que l’alerte n’est pas critique (`danger_level > 2` → refuser sauf `force=true`).
- **Traitements** :
  - Mettre `USER_ALERTS.status = snoozed` et `snooze_until`.
  - Ajouter entrée `ALERT_ACTION_LOG` (`action="snooze"`).
  - Notifier le moteur d’alertes pour empêcher la répétition.
- **Réponse 200** : état de l’alerte après mise à jour.

### `POST /api/v1/glucose/alerts/escalate`

- **Rôles autorisés** : `patient`, `admin`. `doctor` uniquement si habilité à gérer l’escalade pour un patient (vérifier relation `DOCTORS`).
- **Body** : `{ "alertId": "uuid", "contactId": "uuid", "message": "No response detected" }`
- **Traitements** :
  - Vérifier que le contact appartient à l’utilisateur (table `CONTACT`).
  - Envoi push/SMS/appel via service tiers (mockable en dev).
  - Mettre `USER_ALERTS.status = escalated`, incrémenter `escalation_level`.
  - Log dans `ALERT_ACTION_LOG` (`action="escalate"`, `payload`=message).
- **Réponse 202** : identifiant d’escalade + statut `pending`.

### `POST /api/v1/dashboard/actions/quick`

- **Rôles autorisés** : `patient` (actions directes), `admin` (mode assistance). Les docteurs ne voient pas ces actions depuis le dashboard patient.
- **Usage** : actions contextuelles sur le dashboard (ex. “Treat Hypo”, “Already Treated”, “Call emergency contact”).
- **Body** :
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
- **Traitements** :
  - Dispatcher selon `action` :
    - `treat_hypo` → créer tâche de suivi (timer 15 min), log action.
    - `already_treated` → `USER_ALERTS.status = acknowledged` + log.
    - `call_emergency` → déclencher `alerts/escalate` + log.
  - Enregistrer l’action dans `DASHBOARD_ACTIONS` avec métadonnées.
- **Réponse 202** : instructions à afficher au front (`nextSteps`).

## Processus d’escalade automatique

1. Une alerte critique (`danger_level=3`) est déclenchée.
2. Si aucune réponse (acknowledge) sous 5 minutes → création d’un job `alert_escalation`.
3. Job consulte `CONTACT` et déclenche `alerts/escalate` (appel ou SMS).
4. Après 2 minutes supplémentaires sans réponse → appel services d’urgence (selon configuration).

## Tests requis

- **Unitaires** :
  - Validation des durées de snooze et transitions de statut.
  - Génération des logs `ALERT_ACTION_LOG` et `DASHBOARD_ACTIONS`.
- **Intégration** :
  - Scénario CU03.2 complet (hypo détectée → alerte → action “Treat Hypo” → timer).
  - Escalade multi-niveaux (pending → escalated → resolved).
- **E2E** : tests manuels/automatisés sur mobile pour vérifier vibration/son.

## Monitoring

- `alerts_pending_total`, `alerts_escalated_total`, `alerts_snoozed_total`.
- `dashboard_actions_total{action="treat_hypo"}`.
- Temps de réponse `alerts/escalate` (doit < 2 s pour contact). 

## Hypothèses

- Les traitements automatiques (timer 15 min) seront gérés via worker (Celery/Redis). Ce fichier documente uniquement l’API de déclenchement.
- Les alertes relatives aux prévisions (`prediction` type) utilisent le même pipeline mais seront implémentées lors du module IA.

