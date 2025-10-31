# Tests, monitoring & conformité

Ce document compile les exigences transverses de qualité, de sécurité et de traçabilité.

## Couverture de tests

### Unitaires

- **Objectif** : ≥ 80 % de couverture pour les modules modifiés.
- **Outils** : Pytest + coverage.
- **Bonnes pratiques** :
  - Tester validations des sérialiseurs.
  - Tester services métiers (aggrégations, calculs TIR, observance, etc.).
  - Mock des intégrations externes (services ML, notifications, capteurs) via fixtures.

### Intégration

- **Scénarios critiques** :
  - CU02.1 : ouverture dashboard → `GET /dashboard/summary` + `GET /medications/schedule` + WebSocket (glycémie)
  - CU02.2/CU03.2 : alerte hypo → action “Treat Hypo” → timer 15 min → ack.
  - CU02.3 : personnalisation widgets (PATCH layout → GET widgets).
  - CU03.1 : consultation temps réel + historique 90 jours.
- **Outils** : Postman/Newman, Pytest API, ou Cypress (via endpoints backend).

### WebSocket & performance

- **Tests** :
  - Taux de reconnection (<3 tentatives) après coupure réseau.
  - Charge : 5 000 messages/minute sans perte.
  - Latence < 2 s entre insertion CGM et réception front.
- **Outils** : k6, Locust, ou scripts websockets Python.

### Sécurité

- Scan OWASP ZAP sur l’ensemble des endpoints.
- Vérification TLS (minimum 1.2), headers de sécurité (HSTS, CSP si applicable).
- Test d’injection SQL (paramétrer ORM correctement) et de fuite de données (ensurer `Authorization` requis).

## Monitoring & observabilité

### Métriques à exposer

- API REST :
  - `http_requests_total{endpoint=...}`
  - `http_request_duration_ms{endpoint=...}`
  - `http_errors_total{code=...}`
- WebSocket :
  - `ws_connections_active`
  - `ws_messages_sent_total`
  - `ws_heartbeat_failures_total`
- Domaines métier :
  - `glucose_ingest_latency`
  - `alerts_triggered_total{type=...}`
  - `medication_observance_rate`
  - `prediction_failure_total`

### Logs & audit

- Centraliser les logs applicatifs (ELK / Datadog) avec corrélation `trace_id`.
- Stocker l’audit des actions dans `audit_logs`, `ALERT_ACTION_LOG`, `DASHBOARD_ACTIONS`.
- Configurer alertes sur événements critiques : absence de données CGM > 30 min, latence > SLA.

## Conformité & réglementation

- **CNIL/HIPAA** : journal d’audit complet, anonymisation possible pour études (opt-in).
- **FDA/CE** : conserver la traçabilité des algorithmes (version du modèle IA dans `GLYCEMIA_DATA&IA`, champ `model_version`).
- **RGPD** :
  - Consentement explicite pour collecte localisation (`location_opt_in`).
  - Droit à l’effacement : prévoir scripts de purge/anonymisation.
- **Sécurité mobile** : aucune donnée sensible sur lock screen (laissez le front gérer, mais API doit supporter champs `maskOnLockScreen`).

## Déploiement & release

- Pipeline CI : lint → tests unitaires → tests intégration → build docker → déploiement staging.
- Pipeline CD : validation manuelle, contrôle migrations (backup), exécution tests smoke post-déploiement.
- Plan de rollback : script pour revenir à la migration précédente + invalider caches.

## Documentation & communication

- Générer le schéma OpenAPI (`openapi.json`) via drf-spectacular ou FastAPI docs.
- Exporter la collection Postman mise à jour après chaque sprint.
- Maintenir un changelog (`docs/backend-api/CHANGELOG.md` à créer si nécessaire) consignant les évolutions d’API.

Respecter ces exigences garantit une mise en production sécurisée et conforme des modules F02/F03.

