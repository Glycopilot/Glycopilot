# Backend API Specification

Ce dossier décrit l’ensemble des APIs backend à mettre en œuvre pour les fonctionnalités F02 (Dashboard) et F03 (Suivi glycémie). Chaque fichier se concentre sur un sous-domaine fonctionnel et détaille :

- les objectifs métier et le lien avec les cas d’usage (CU02.x, CU03.x) ;
- les endpoints REST/WSS attendus, leurs structures et validations ;
- les tables du MPC concernées, ainsi que les colonnes à ajouter ;
- les exigences de tests et de monitoring.

## Organisation des documents

| Fichier | Contenu |
| --- | --- |
| `conventions.md` | Standards transverses (auth, headers, erreurs, performance). |
| `implementation-plan.md` | Priorités d’implémentation et dépendances. |
| `permissions.md` | Modèle de rôles, règles d’autorisation par endpoint. |
| `auth-profile.md` | Authentification, profil utilisateur, préférences. |
| `glucose-real-time.md` | Mesures glycémie, historique, WebSocket, alertes de base. |
| `dashboard.md` | Agrégations dashboard, gestion des widgets. |
| `alerts-actions.md` | Snooze, escalade, actions rapides, logs d’alerte. |
| `medications.md` | Gestion des prises, observance, stocks. |
| `nutrition-activity.md` | Synthèses nutritionnelles et activité physique. |
| `analytics-reports.md` | Agrégats TIR/TBR/CV/GMI et exports AGP. |
| `devices-predictions.md` | Capteurs, calibrations, prédictions IA et feedbacks. |
| `testing-monitoring.md` | Exigences QA, observabilité, sécurité. |

## Comment utiliser ces documents

1. **Lisez `conventions.md`** pour connaître les règles communes (auth, erreurs, payloads).
2. **Suivez `implementation-plan.md`** pour aborder les modules dans l’ordre recommandé.
3. **Pour chaque ticket Trello**, référez-vous au fichier de sous-domaine correspondant. Les sections « Détails de développement » et « Check de validation » servent de checklist.
4. **Mettez à jour la documentation** après toute décision d’implémentation ou modification de modèle.

## Références complémentaires

- MPC (modèle conceptuel de données) partagé dans la figure `docs/resources/mcd.png` (à ajouter si besoin).
- Tickets Trello découpés par sous-domaine (cf. export fourni séparément).

Pour toute question, documentez vos hypothèses dans le fichier concerné avant implémentation afin de conserver une trace des choix techniques.

