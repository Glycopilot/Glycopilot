# Conventions transverses

## Couche transport

- **Base path** : `/api/v1`
- **Protocoles** : HTTPS pour REST, WSS pour temps réel.
- **Encodage** : UTF-8, JSON uniquement (sauf exports PDF/CSV/HL7).
- **Timestamps** : ISO 8601 en UTC (ex. `2025-10-31T08:00:00Z`).
- **Pagination** : curseur (`nextCursor`) pour les historiques volumineux.

## Sécurité & authentification

- Authentification obligatoire via `Authorization: Bearer <JWT>`.
- Les endpoints sensibles vérifient le scope (`patient`, `caregiver`, `admin`).
- Token refresh géré côté `/auth/token`; logout invalide les sessions WSS.
- TLS 1.2 minimum, recommandation : certificate pinning sur mobile.
- Données au repos chiffrées (AES-256 dans SQLite/Realm côté mobile, TDE côté serveur).

## Rôles & permissions

- Rôles applicatifs : `patient`, `doctor`, `admin` (issus des tables `PROFILS` / `USERS_PROFILS`).
- Chaque méthode de contrôleur définit une liste `ALLOWED_ROLES` (ex. `['patient', 'doctor']`).
- Middleware Django personnalisé (`RolePermissionMiddleware`) :
  1. Extrait le rôle depuis le JWT (claim `role`) ou via base (`USERS_PROFILS`).
  2. Vérifie que le rôle courant ∈ `ALLOWED_ROLES`; sinon `403` avec code `PERMISSION_DENIED`.
  3. Journalise l’accès (table `audit_logs`).
- Exemple de décorateur :
  ```python
  class RoleRequiredMixin:
      allowed_roles: list[str] = []

      def dispatch(self, request, *args, **kwargs):
          user_role = request.user.role
          if user_role not in self.allowed_roles:
              raise PermissionDenied("Role not allowed")
          return super().dispatch(request, *args, **kwargs)
  ```
- Règle par défaut :
  - Endpoints “patient-facing” (dashboard, glycémie, médicaments, nutrition, activité) → `patient` (et `doctor` en lecture). 
  - Endpoints administratifs (gestion utilisateurs, exports globaux) → `admin` uniquement.
  - Les docteurs ont accès en lecture aux données de leurs patients (vérifier via relation `DOCTORS` ↔ `USERS`).

### Contrôle d’accès aux données (scoping)

- **Patient** : toutes les requêtes doivent filtrer sur `user_id = request.user.id`. Ne jamais exposer d’ID tiers dans les réponses.
- **Doctor** : vérifier l’appartenance via jointure `DOCTORS.medical_id = request.user.medical_id` et `USERS.medical_id` ou table de liaison ; si non associé → `404` (masquer existence) ou `403` (selon sensibilité).
- **Admin** : accès global mais actions d’écriture nécessitent justificatif dans `audit_logs` (`performed_by`, `reason`).
- Mise en place d’un mixin `OwnershipQuerysetMixin` qui applique automatiquement ces filtres dans `get_queryset()`.
- Pour les WebSockets, vérifier l’autorisation lors du `connect` et restreindre les messages émis au périmètre du client.

## Format d’erreur standard

```json
{
  "error": {
    "code": "GLY-F03-VALIDATION",
    "message": "Value outside allowed range",
    "details": {
      "field": "value",
      "min": 20,
      "max": 600
    }
  }
}
```

Codes HTTP à utiliser :

| Code | Situation |
| --- | --- |
| 400 | Validation métier ou payload invalide |
| 401 | Token absent ou expiré |
| 403 | Scope insuffisant |
| 404 | Ressource inexistante |
| 409 | Conflit métier (limite saisies, statut incohérent) |
| 422 | Cohérence temporelle ou données aberrantes |
| 429 | Rate limit dépassée (header `Retry-After`) |

## Spécificités WebSocket

- Authentification par header `Authorization` ou token signed query.
- Heartbeat `{ "type": "ping" }` toutes les 45 s, réponse `{ "type": "pong" }` côté client.
- Reconnexion avec back-off exponentiel (5 s → 30 s) et détection de doublons via `connectionId`.
- Souscription par topics (`glucose.live`, `alerts.critical`, `dashboard.refresh`).

## Performance & SLA

- Temps de réponse cible :
  - `GET /dashboard/summary` < 800 ms
  - `GET /glucose/current` < 500 ms
  - `POST /glucose/manual-readings` < 700 ms (avec validations)
- Uptime API > 99,5 %. Les dégradations doivent déclencher des alertes (Datadog/Prometheus).
- Impact batterie mobile < 5 % / 24 h (optimiser fréquence WebSocket, compressions).

## Journalisation & audit

- Chaque mutation (POST/PUT/PATCH/DELETE) journalise `userId`, `ip`, `deviceId`, `payloadHash` dans une table `audit_logs` (à implémenter).
- Les consultations critiques (`/glucose/current`, `/dashboard/summary`) sont loggées pour traçabilité médicale (CNIL/HIPAA).

## Standards de tests

- Unitaires : utiliser Pytest (ou unittest) avec couverture > 80 % sur les modules modifiés.
- Intégration : scripts Postman ou Pytest API pour les cas CU02.x / CU03.x.
- WebSocket : tests automatisés (channels testing ou websockets lib) couvrant subscribe, heartbeat, reconnection, throttling.
- Sécurité : scans OWASP ZAP sur les endpoints et vérification TLS.

Ces conventions s’appliquent à **tous** les modules décrits dans les fichiers suivants.

