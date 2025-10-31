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

