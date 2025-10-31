# Plan d’implémentation

Ce plan ordonne les travaux backend selon les dépendances fonctionnelles et techniques. Chaque étape renvoie au fichier de référence détaillant les endpoints.

| Ordre | Module | Objectifs clés | Dépendances |
| --- | --- | --- | --- |
| 1 | **Préparatifs schéma** (`auth-profile.md`, `glucose-real-time.md`) | Alignement MPC ↔ modèles Django, migrations, nouvelles tables support. | — |
| 2 | **Auth & profil** (`auth-profile.md`) | Tokens, profil, préférences. | Étape 1 |
| 3 | **Glycémie temps réel** (`glucose-real-time.md`) | Saisie manuelle, historique, WebSocket, alertes de base. | Étapes 1-2 |
| 4 | **Dashboard** (`dashboard.md`) | Agrégations, widgets, layout utilisateur. | Étapes 1-3 |
| 5 | **Alertes avancées** (`alerts-actions.md`) | Snooze, escalade, actions rapides, journaux. | Étape 3 |
| 6 | **Médicaments** (`medications.md`) | Planning, observance, stocks. | Étapes 1-3 |
| 7 | **Nutrition & activité** (`nutrition-activity.md`) | Bilans nutritionnels, activité quotidienne. | Étapes 1-3 |
| 8 | **Analytics & rapports** (`analytics-reports.md`) | TIR/TAR/CV/GMI, exports AGP. | Étapes 1-3 |
| 9 | **Capteurs & prédictions** (`devices-predictions.md`) | Gestion capteurs, calibrations, IA, feedback. | Étapes 1-3 |
| 10 | **QA & observabilité** (`testing-monitoring.md`) | Tests intégrés, monitoring, sécurité. | Toutes |

## Pré-requis techniques

- Framework backend : Django/DRF + Channels (ou FastAPI). Vérifier compatibilité avec WebSocket.
- Base de données : Postgres recommandé (support JSONB, index), adapter migrations si SQLite en dev.
- Services externes : modèle de prédiction IA exposé via FastAPI (`/predict`), service de notification (FCM/Twilio).

## Gouvernance

- Chaque module nécessite une **revue de code** + mise à jour de la documentation correspondante.
- Les livraisons doivent s’accompagner d’un **plan de tests** (unitaires + intégration) et d’un **rapport de migration**.
- Les décisions d’implémentation divergentes doivent être consignées dans un paragraphe “Décisions & Hypothèses” dans le fichier module.

Suivre ce plan garantit la cohérence fonctionnelle et facilite l’activation progressive du dashboard F02 et du suivi glycémique F03.

