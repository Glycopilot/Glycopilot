# Modèle de permissions

Ce document récapitule les rôles applicatifs et les autorisations associées à chaque endpoint.

## Rôles

| Rôle | Description | Sources |
| --- | --- | --- |
| `patient` | Utilisateur principal, gère son dashboard et ses données personnelles. | Table `USERS` (profil patient). |
| `doctor` | Professionnel de santé rattaché à un patient via `DOCTORS` / `USERS_PROFILS`. Accès en lecture aux données des patients suivis. | `DOCTORS`, `USERS_PROFILS`. |
| `admin` | Support ou personnel interne. Peut agir pour débloquer un patient (mode assistance). | `USERS_PROFILS` avec rôle administrateur. |

### Règles générales

- L’authentification JWT embarque le rôle principal (`role` claim). Un middleware vérifie l’appartenance du rôle au tableau `ALLOWED_ROLES` défini sur chaque méthode de contrôleur.
- Les docteurs ne peuvent consulter que les données des patients auxquels ils sont explicitement rattachés (`USERS.medical_id` ↔ `DOCTORS.medical_id`).
- Les administrateurs peuvent intervenir en lecture/écriture pour assistance, mais toute action doit être auditée (`audit_logs`).
- Les contrôleurs doivent appliquer des filtres de propriété :
  - **Patient** : `queryset.filter(user_id=request.user.id)` (ou renvoyer `403`).
  - **Doctor** : filtrer via une sous-requête `user_id__in=DoctorAssignment.patients_of(request.user)`.
  - **Admin** : accès complet, mais vérifier `request.user.is_superuser` si réutilisation auth Django.
- Définir un mixin DRF ou décorateur `@allowed_roles('patient', 'doctor')` appliqué sur chaque view.
- Ajouter une propriété `allowed_roles` sur les classes de vue. Ex. :
  ```python
  class GlucoseHistoryView(RoleRequiredMixin, OwnershipQuerysetMixin, APIView):
      allowed_roles = ['patient', 'doctor', 'admin']

      def get_queryset(self):
          qs = GlucoseReading.objects.all()
          return self.scope_queryset(qs)
  ```
- Pour les vues `ViewSet`, surcharger `get_permissions()` en fonction de l’action (`self.action`).

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

- Définir un mixin DRF ou décorateur `@allowed_roles('patient', 'doctor')` appliqué sur chaque view.
- Ajouter une propriété `allowed_roles` sur les classes de vue. Ex. :
  ```python
  class GlucoseHistoryView(RoleRequiredMixin, APIView):
      allowed_roles = ['patient', 'doctor', 'admin']
  ```
- Pour les vues `ViewSet`, surcharger `get_permissions()` en fonction de l’action (`self.action`).
- Les contrôleurs WebSocket doivent effectuer la même vérification lors de la connexion (`connect`).
- Mettre en place des tests automatisés couvrant :
  - accès refusé (`403`) pour un rôle non listé,
  - accès autorisé pour les rôles valides,
  - visibilité restreinte pour les docteurs (vérifier qu’ils n’accèdent qu’aux patients assignés).

Cette matrice doit être synchronisée avec les tickets Trello et la documentation API pour garantir une implémentation cohérente de la sécurité.

