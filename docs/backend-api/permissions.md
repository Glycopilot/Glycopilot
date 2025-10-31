# Modèle de permissions

Ce document récapitule les rôles applicatifs et les autorisations associées à chaque endpoint.

## Rôles

| Rôle | Description | Sources |
| --- | --- | --- |
| `patient` | Utilisateur principal, gère son dashboard et ses données personnelles. | Table `USERS` (profil patient). |
| `doctor` | Professionnel de santé rattaché à un patient via `DOCTORS` / `USERS_PROFILS`. Accès en lecture aux données des patients suivis. | `DOCTORS`, `USERS_PROFILS`. |
| `admin` | Support ou personnel interne. Peut agir pour débloquer un patient (mode assistance). | `USERS_PROFILS` avec rôle administrateur. |

### Règles générales

- L’authentification JWT embarque le rôle principal (`role` claim). Un middleware inspecte **la liste `ALLOWED_ROLES` déclarée par la méthode de contrôleur** et refuse l’accès si le rôle n’est pas autorisé.
- Les docteurs ne peuvent consulter que les données des patients auxquels ils sont explicitement rattachés (`USERS.medical_id` ↔ `DOCTORS.medical_id` ou table d’assignation dédiée).
- Les administrateurs peuvent intervenir en lecture/écriture pour assistance, mais toute action doit être auditée (`audit_logs`).
- Les contrôleurs appliquent des filtres de propriété explicites :
  - **Patient** : filtrer sur `user_id = request.user.id` (sinon `403`).
  - **Doctor** : ajouter une condition `user_id__in = DoctorAssignment.for_user(request.user)`.
  - **Admin** : accès complet, mais documenter la raison (`performed_by`, `reason`).
- Créer un décorateur `@allowed_roles([...])` ou un helper `require_roles(['patient'])` à appliquer sur chaque méthode de contrôleur.
- Exemple :
  ```python
  @allowed_roles(['patient', 'doctor', 'admin'])
  def get_history(self, request):
      readings = GlucoseService.scope(request.user).history()
      ...
  ```
- Centraliser la logique de filtrage dans un utilitaire (`GlucoseService.scope(user)` ci-dessus) ou un mixin `OwnershipMixin` partagé par les contrôleurs.
- Ajouter des tests automatisés couvrant :
  - accès refusé (`403`) pour un rôle non listé,
  - accès autorisé pour les rôles valides,
  - restriction docteur → patient non assigné (`404` ou `403`).

## Autorisations par module

### Authentification & profil

| Endpoint | Méthode | Rôles |
| --- | --- | --- |
| `/auth/token` | POST | `patient`, `doctor`, `admin` |
| `/auth/logout` | POST | `patient`, `doctor`, `admin` |
| `/user/profile` | GET | `patient`, `doctor`, `admin` (docteur voit profil patient si autorisé) |
| `/user/profile` | PATCH | `patient`, `admin` |
| `/user/preferences` | GET | `patient`, `doctor`, `admin` |
| `/user/preferences` | PATCH | `patient`, `admin` |

### Glycémie & alertes de base

| Endpoint | Méthode | Rôles |
| --- | --- | --- |
| `/glucose/manual-readings` | POST | `patient`, `admin` |
| `/glucose/current` | GET | `patient`, `doctor`, `admin` |
| `/glucose/history` | GET | `patient`, `doctor`, `admin` |
| `/glucose/alerts` | GET | `patient`, `doctor`, `admin` |
| `/glucose/alerts/{id}/acknowledge` | POST | `patient`, `admin`, `doctor` (si habilité) |
| `/streams/glucose` | WSS | `patient`, `doctor`, `admin` |

### Dashboard

| Endpoint | Méthode | Rôles |
| --- | --- | --- |
| `/dashboard/summary` | GET | `patient`, `doctor`, `admin` |
| `/dashboard/widgets` | GET | `patient`, `doctor`, `admin` |
| `/dashboard/widgets/layout` | PATCH | `patient`, `admin` |
| `/dashboard/actions/quick` | POST | `patient`, `admin` |

### Alertes avancées

| Endpoint | Méthode | Rôles |
| --- | --- | --- |
| `/glucose/alerts/snooze` | POST | `patient`, `admin` |
| `/glucose/alerts/escalate` | POST | `patient`, `admin`, `doctor` (si mandat explicite) |

### Médicaments

| Endpoint | Méthode | Rôles |
| --- | --- | --- |
| `/medications/schedule` | GET | `patient`, `doctor`, `admin` |
| `/medications/intake` | POST | `patient`, `admin` |
| `/medications/intake/{id}/reschedule` | POST | `patient`, `admin` |
| `/medications/stock` | GET | `patient`, `doctor`, `admin` |

### Nutrition & activité

| Endpoint | Méthode | Rôles |
| --- | --- | --- |
| `/nutrition/summary` | GET | `patient`, `doctor`, `admin` |
| `/nutrition/recommendations` | GET | `patient`, `doctor`, `admin` |
| `/activity/today` | GET | `patient`, `doctor`, `admin` |
| `/activity/recommendations` | GET | `patient`, `doctor`, `admin` |
| `/activity/manual-entry` | POST | `patient`, `admin` |

### Analytics & rapports

| Endpoint | Méthode | Rôles |
| --- | --- | --- |
| `/glucose/aggregates` | GET | `patient`, `doctor`, `admin` |
| `/analytics/insights` | GET | `patient`, `doctor`, `admin` |
| `/analytics/reports/agp` | GET | `patient`, `doctor`, `admin` |

### Capteurs & prédictions

| Endpoint | Méthode | Rôles |
| --- | --- | --- |
| `/devices/sensors` | GET | `patient`, `doctor`, `admin` |
| `/devices/sensors/{id}/calibrations` | POST | `patient`, `admin` |
| `/devices/sensors/{id}/diagnostics` | POST | `patient`, `admin` |
| `/devices/sensors/{id}/reset` | POST | `patient`, `admin` |
| `/glucose/predictions` | GET | `patient`, `doctor`, `admin` |
| `/glucose/predictions/feedback` | POST | `patient`, `admin` |

### QA / Monitoring

| Endpoint | Méthode | Rôles |
| --- | --- | --- |
| `/system/status`, `/system/metrics`, `/audit/events` | GET | `admin` uniquement |

## Implémentation technique proposée

- Créer un décorateur `@allowed_roles([...])` ou une fonction utilitaire `require_roles(['patient'])` à appliquer sur chaque **méthode de contrôleur** (`controllers/api_controller.py`, etc.).
  ```python
  @allowed_roles(['patient', 'doctor', 'admin'])
  def get_history(self, request):
      readings = GlucoseService.scope(request.user).history()
      ...
  ```
- Centraliser le filtrage des données dans un helper (`Service.scope(user)`), appelé systématiquement en début de méthode.
- Veiller à ce que les contrôleurs WebSocket appellent également `require_roles` au `connect`.
- Mettre en place des tests automatisés couvrant :
  - accès refusé (`403`) pour un rôle non listé,
  - accès autorisé pour les rôles valides,
  - restriction docteur ↔ patient (patient non assigné → `404` ou `403`).

Cette matrice doit être synchronisée avec les tickets Trello et la documentation API pour garantir une implémentation cohérente de la sécurité.

