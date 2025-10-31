# Analytics & rapports glycémiques

Correspond à F03.4 (visualisation avancée), F03.5 (analyse prédictive) pour la partie agrégats, ainsi qu’aux critères d’acceptation CA03.1–CA03.8 liés aux métriques cliniques.

## Tables & vues de données

- `GLYCEMIA_HISTO` : base de calcul pour TIR/TBR/TAR/CV/GMI.
- `GLYCEMIA_DATA&IA` : contient zones colorées, prédictions de tendance (utilisé pour AGP).
- `REPORT_JOBS` (nouvelle) : suivi des exports AGP (`job_id`, `user_id`, `range_start`, `range_end`, `format`, `status`, `created_at`, `completed_at`, `download_path`).
- `USER_ALERTS` / `USER_MEDICATIONS` / `USERS_MEALS` / `USER_ACTIVITY` : utilisés pour les rapports corrélés (glycémie vs repas/activité).

## Métriques cliniques

- **Time In Range (TIR)** = % du temps 70–180 mg/dL.
- **Time Below Range (TBR)** = % du temps <70 mg/dL (distinction <55).
- **Time Above Range (TAR)** = % du temps >180 mg/dL (distinction >250).
- **Coefficient of Variation (CV)** = σ / µ × 100. Objectif < 36 %.
- **Glucose Management Indicator (GMI)** = estimation HbA1c via formule ADA.

## Endpoints

### `GET /api/v1/glucose/aggregates`

- **Rôles autorisés** : `patient`, `doctor` (lecture), `admin`.
- **Paramètres** : `period=daily|weekly|monthly`, `start` (ISO date), `compare=true` (inclure période précédente).
- **Réponse 200** :
  ```json
  {
    "period": "daily",
    "startDate": "2025-10-30",
    "endDate": "2025-10-30",
    "metrics": {
      "tir": 0.72,
      "tbr": 0.08,
      "tar": 0.20,
      "average": 145,
      "unit": "mg/dL",
      "cv": 0.34,
      "gmi": 6.9
    },
    "comparison": {
      "tir": 0.68,
      "trend": "+0.04"
    }
  }
  ```
- **Calcul** :
  - Récupérer mesures `GLYCEMIA_HISTO` sur la plage → interpolation 5 min si besoin.
  - Calculer proportions dans chaque zone.
  - Générer `comparison` si `compare=true` (période précédente de même durée).
- **Performances** : index sur `(user_id, measured_at)` + éventuellement table agrégée quotidienne.

### `GET /api/v1/analytics/insights`

- **Rôles autorisés** : `patient`, `doctor`, `admin`. Filtrer les données pour ne montrer au docteur que les patients suivis.
- **Usage** : mettre en avant patterns (pic postprandial, hypos nocturnes, phénomène de l’aube).
- **Réponse** :
  ```json
  {
    "patterns": [
      {
        "type": "dawn_phenomenon",
        "description": "Glycémie > 180 mg/dL entre 05:00 et 07:00 sur 4 jours",
        "recommendation": "Ajouter correction rapide au réveil",
        "evidence": [
          { "date": "2025-10-28", "max": 210 }
        ]
      }
    ]
  }
  ```
- **Algorithmes** : scripts d’analyse sur `GLYCEMIA_HISTO` + corrélation repas (`USERS_MEALS`) ou activité (`USER_ACTIVITY`).

### `GET /api/v1/analytics/reports/agp`

- **Rôles autorisés** : `patient` (auto-export), `doctor` (export pour patient suivi), `admin` (support). |
- **Paramètres** : `rangeStart`, `rangeEnd`, `format=pdf|csv|hl7`.
- **Réponse 202** : job en cours.
- **Flux** :
  1. Validation plage (≤ 90 jours).
  2. Création job `REPORT_JOBS` (`status=pending`).
  3. Worker génère le rapport (AGP : médian, percentile 10/90, DOD 24 h).
  4. Stockage fichier (S3 ou local) + mise à jour `downloadPath`.
  5. Client poll `GET /analytics/reports/agp/{jobId}` jusqu’à `status=ready`.
- **Payload final** : `{ "jobId": "uuid", "status": "ready", "downloadUrl": "https://..." }` (URL signée 24 h).

## Graphiques supportés

- Courbes temps réel (3 h) → endpoints `glucose/history` + websockets.
- Graphique en aires (24 h/7 j/30 j) → `GLYCEMIA_DATA&IA` zones colorées.
- Diagramme AGP → `analytics/reports/agp`.
- Histogramme distribution valeurs → calcul local (open data).
- Corrélations (glucose vs repas/activité) → endpoint `analytics/insights` expose jeux de données agrégés.

## Tests & contrôles qualité

- **Unitaires** : formules TIR/TBR/CV/GMI, arrondis, conversions mg/dL ↔ mmol/L.
- **Intégration** :
  - Génération AGP sur 14 jours → vérifier format PDF/CSV.
  - Comparaison `compare=true` (variations positives/négatives).
- **Performance** : temps de calcul agrégats < 300 ms sur 90 jours.
- **Validation clinique** : confronter TIR/TBR/GMI avec données de référence Dexcom/Libre (datasets test).

## Monitoring

- `analytics_aggregate_duration_ms`
- `analytics_agp_jobs_total{status=ready|failed}`
- `analytics_agp_job_duration_ms`

## Hypothèses

- La génération de rapports est asynchrone (worker Celery recommandé). Retours synchrones pourraient être ajoutés pour petits intervalles si besoin.
- Les exports HL7 nécessitent un mapping vers ressources FHIR (Observation, MedicationStatement). À planifier en phase réglementaire.

