# Glycopilot — Module IA : Vue d'ensemble

## Objectif

Le module IA de Glycopilot a pour but de prédire l'évolution du taux de glycémie d'un utilisateur sur des horizons courts (15, 30 et 60 minutes), de générer des alertes préventives (hypoglycémie / hyperglycémie) et de formuler des recommandations personnalisées.

## Table des matières

| Document | Description |
|---|---|
| [README.md](./README.md) | Ce fichier — vue d'ensemble |
| [architecture.md](./architecture.md) | Architecture complète du système IA |
| [dataset.md](./dataset.md) | Analyse du dataset, pipeline de données, feature engineering |
| [models.md](./models.md) | Architectures des modèles ML (Baseline, LSTM, Transformer, Ensemble) |
| [api.md](./api.md) | Contrat API du microservice FastAPI |
| [mlops.md](./mlops.md) | Entraînement, évaluation, versioning, déploiement |

---

## Architecture en un coup d'œil

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (React Native)               │
└─────────────────────────────┬────────────────────────────────┘
                              │ REST / WebSocket
┌─────────────────────────────▼────────────────────────────────┐
│                    Backend Django (existant)                  │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │  apps/glycemia  │    │  GlycemiaDataIA (PostgreSQL)  │    │
│  │  GlycemiaHisto  │    │  Prédictions stockées         │    │
│  └────────┬────────┘    └──────────────┬───────────────┘    │
│           │ HTTP POST                  │ Django écrit        │
└───────────┼────────────────────────────┼────────────────────┘
            │                            │
┌───────────▼────────────────────────────▼────────────────────┐
│                  Microservice IA (FastAPI)                   │
│                  ai_service/  — port 8001                   │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Baseline   │  │     LSTM     │  │    Transformer    │  │
│  │  (ARIMA /   │  │  (PyTorch)   │  │    (PyTorch)      │  │
│  │  LR)        │  │              │  │                   │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│            \              |                /                 │
│             \             |               /                  │
│              ┌────────────▼──────────────┐                  │
│              │       Ensemble            │                  │
│              │  (weighted average)       │                  │
│              └───────────────────────────┘                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Feature Engineering Pipeline                       │    │
│  │  Lags · Rolling stats · ROC · Contexte repas/sport  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Flux de prédiction

1. Un nouveau relevé CGM est enregistré dans `GlycemiaHisto` (Django)
2. Le signal `post_save` de Django envoie un `HTTP POST` au microservice IA
3. Le microservice récupère la fenêtre d'entrée (2h d'historique) depuis `GlycemiaHisto`
4. Le pipeline de features transforme les données brutes
5. Chaque modèle produit ses prédictions (y_hat_15/30/60, p10/p90, risk_hypo/hyper)
6. L'Ensemble agrège les sorties avec des poids appris
7. Le microservice retourne le résultat JSON au backend Django
8. Django persiste le résultat dans `GlycemiaDataIA`
9. Si un risque dépasse le seuil, Django déclenche une alerte via `apps.alerts`

## Seuils cliniques de référence

| Condition | Seuil |
|---|---|
| Hypoglycémie | < 70 mg/dL |
| Cible basse | 70 – 100 mg/dL |
| Cible normale | 100 – 140 mg/dL |
| Cible haute | 140 – 180 mg/dL |
| Hyperglycémie | > 180 mg/dL |
| Urgence hypo | < 54 mg/dL |
| Urgence hyper | > 250 mg/dL |

## Roadmap

| Phase | Contenu | Statut |
|---|---|---|
| 1 | Architecture + documentation | ✅ En cours |
| 2 | Installation dépendances + exploration dataset | 🔜 |
| 3 | Feature engineering + Baseline model | 🔜 |
| 4 | LSTM model + évaluation | 🔜 |
| 5 | Transformer model | 🔜 |
| 6 | Ensemble + seuils de confiance | 🔜 |
| 7 | Microservice FastAPI + intégration Django | 🔜 |
| 8 | Tests + déploiement Docker | 🔜 |
