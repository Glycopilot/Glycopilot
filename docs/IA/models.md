# Architectures des Modèles ML

## Vue d'ensemble

Cinq modèles sont implémentés avec une progression en complexité :

| Modèle | Complexité | Temps d'entraînement | Interprétabilité | Usage |
|---|---|---|---|---|
| Baseline (LR) | Faible | < 1 min | Haute | Benchmark minimal |
| **XGBoost** | Moyenne | 2–5 min | Moyenne | Modèle fort tabulaire — très efficace @15min |
| LSTM | Moyenne | 30–60 min | Moyenne | Capture dépendances long terme |
| Transformer | Haute | 1–3h | Faible | État de l'art séquentiel |
| Ensemble | Agrégation | Dépend des sous-modèles | Moyenne | Production |

> **Pourquoi XGBoost ?** Les features lags/rolling stats sont des features tabulaires — domaine où XGBoost excelle. Sur les horizons courts (15 min), XGBoost surpasse souvent le LSTM car la glycémie reste très corrélée à ses valeurs récentes. Le LSTM/Transformer reprend l'avantage à 60 min où les effets long terme (repas, exercice) dominent.

---

## 1. Baseline — Régression Linéaire + Persistence

### Objectif
Établir un seuil de performance minimal. Tout modèle ML doit surpasser ce baseline.

### Deux sous-modèles

**1a. Persistence Model** (le plus simple possible)
```
Prédiction = dernière valeur connue
y_hat_15 = glucose_t0
y_hat_30 = glucose_t0
y_hat_60 = glucose_t0
```

**1b. Linear Regression avec features temporelles**
```python
Features : [glucose_t0, glucose_lag_5, glucose_lag_15, glucose_lag_30,
            glucose_roc, glucose_rolling_mean_30, time_of_day_sin, time_of_day_cos]

Un modèle LR séparé par horizon :
  - lr_15 : prédit y_15
  - lr_30 : prédit y_30
  - lr_60 : prédit y_60
```

### Intervalles de confiance (Baseline)
Estimés par **quantile regression** (sklearn `QuantileRegressor`) avec α=0.10 et α=0.90.

### Scores de risque (Baseline)
```python
risk_hypo_X = max(0, (70 - y_hat_X) / 30)   # normalisé 0-1
risk_hyper_X = max(0, (y_hat_X - 180) / 70)  # normalisé 0-1
```

---

## 2. LSTM — Long Short-Term Memory

### Justification du choix
- Les séries temporelles de glycémie ont des dépendances à long terme (effets repas jusqu'à 2h)
- Le LSTM gère naturellement les séquences de longueur variable
- Architecture éprouvée pour la prédiction glycémique dans la littérature

### Architecture

```
Input : (batch, 24, N_features)   ← 24 steps × 5min = 2h de contexte

┌─────────────────────────────┐
│  LSTM Layer 1               │
│  hidden_size = 128          │
│  dropout = 0.2              │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│  LSTM Layer 2               │
│  hidden_size = 64           │
│  dropout = 0.2              │
└─────────────┬───────────────┘
              │ (dernier hidden state)
┌─────────────▼───────────────┐
│  Dropout (0.3)              │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│  Linear(64, 32)  + ReLU     │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│  Têtes de sortie multiples  │
│                             │
│  ┌──────────────────────┐   │
│  │ Head 15min           │   │
│  │ Linear(32, 3)        │   │
│  │ → [y_hat, p10, p90]  │   │
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ Head 30min           │   │
│  │ Linear(32, 3)        │   │
│  │ → [y_hat, p10, p90]  │   │
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ Head 60min           │   │
│  │ Linear(32, 3)        │   │
│  │ → [y_hat, p10, p90]  │   │
│  └──────────────────────┘   │
└─────────────────────────────┘

Output : 9 valeurs
  [y_hat_15, p10_15, p90_15,
   y_hat_30, p10_30, p90_30,
   y_hat_60, p10_60, p90_60]
```

### Hyperparamètres

| Paramètre | Valeur |
|---|---|
| Séquence d'entrée | 24 steps (2h) |
| LSTM layers | 2 |
| Hidden size L1 | 128 |
| Hidden size L2 | 64 |
| Dropout | 0.2 (LSTM) / 0.3 (FC) |
| Optimizer | Adam (lr=1e-3) |
| Scheduler | ReduceLROnPlateau (patience=5) |
| Epochs | 100 (early stopping patience=15) |
| Batch size | 64 |
| Loss | Pinball loss (quantile regression) |

### Fonction de perte — Pinball Loss

Utilisée pour entraîner simultanément les prédictions de point et les quantiles :

```
L = α × max(y - ŷ, 0) + (1-α) × max(ŷ - y, 0)

Pour y_hat : MSE standard
Pour p10   : Pinball(α=0.10)
Pour p90   : Pinball(α=0.90)

Loss totale = MSE(y_hat) + λ × [Pinball_p10 + Pinball_p90]
```

### Scores de risque (LSTM)
Calculés post-prédiction via sigmoid calibrée :
```python
risk_hypo_X = sigmoid((70 - y_hat_X) / temperature)
risk_hyper_X = sigmoid((y_hat_X - 180) / temperature)
# temperature = paramètre appris sur le val set
```

---

## 3. Transformer

### Justification
- Mécanisme d'attention multi-têtes : identifie quels timesteps passés sont les plus pertinents
- Parallélisable (entraînement plus rapide que LSTM sur GPU)
- Performant sur les séries temporelles longues
- Représente l'état de l'art pour la prédiction glycémique (cf. litterature 2023-2024)

### Architecture

```
Input : (batch, 24, N_features)

┌─────────────────────────────────┐
│  Linear projection              │
│  (N_features → d_model=64)      │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  Positional Encoding            │
│  (encodage sinusoïdal des       │
│   positions temporelles)        │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  Transformer Encoder × 4 layers │
│                                 │
│  Chaque layer :                 │
│  ┌───────────────────────────┐  │
│  │  Multi-Head Attention     │  │
│  │  n_heads=8, d_k=8         │  │
│  │  dropout=0.1              │  │
│  └───────────┬───────────────┘  │
│              │ + residual       │
│  ┌───────────▼───────────────┐  │
│  │  Layer Norm               │  │
│  └───────────┬───────────────┘  │
│              │                  │
│  ┌───────────▼───────────────┐  │
│  │  Feed-Forward (64→256→64) │  │
│  │  GELU activation          │  │
│  └───────────┬───────────────┘  │
│              │ + residual       │
│  ┌───────────▼───────────────┐  │
│  │  Layer Norm               │  │
│  └───────────────────────────┘  │
└──────────────┬──────────────────┘
               │ (dernier token = représentation globale)
┌──────────────▼──────────────────┐
│  Global Average Pooling         │
│  (sur dimension temporelle)     │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  Têtes de sortie (identiques    │
│  au LSTM — 3 heads × 3 outputs) │
└─────────────────────────────────┘
```

### Hyperparamètres

| Paramètre | Valeur |
|---|---|
| d_model | 64 |
| n_heads | 8 |
| n_encoder_layers | 4 |
| d_ff | 256 |
| Dropout | 0.1 |
| Optimizer | AdamW (lr=1e-4, weight_decay=1e-4) |
| Scheduler | CosineAnnealingLR |
| Epochs | 150 (early stopping patience=20) |
| Batch size | 32 |
| Loss | Pinball (identique au LSTM) |

---

## 4. XGBoost

### Justification
XGBoost est un **gradient boosting sur arbres de décision**. Il est particulièrement performant sur les features tabulaires comme les lags et rolling stats déjà présents dans notre dataset. À l'horizon 15 min, la glycémie est encore très corrélée à ses valeurs récentes — domaine où XGBoost excelle sans avoir besoin de modéliser la séquence entière.

### Configuration

```python
XGBRegressor(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,
    reg_alpha=0.1,       # L1
    reg_lambda=1.0,      # L2
    objective="reg:squarederror",
    random_state=42,
)
```

Un modèle XGB séparé par horizon (15/30/60 min) + deux modèles quantile (p10/p90) par horizon via `reg:quantileerror`.

### Input
Contrairement au LSTM/Transformer, XGBoost utilise uniquement le **dernier timestep** de la fenêtre :
```
features[-1]  →  shape (N_features,)  →  XGBRegressor.predict()
```

### Avantages vs LSTM sur ce dataset
- Entraînement < 5 min vs 30–60 min pour le LSTM
- Très bon @15min (signal très local)
- Interprétable via `feature_importances_` (permet de voir quels lags comptent le plus)
- Robuste aux valeurs manquantes (géré nativement par XGBoost)

---

## 5. Ensemble

### Principe
Combine les prédictions de Baseline, **XGBoost**, LSTM et Transformer avec des **poids appris** sur le validation set.

### Méthode : Stacking avec méta-modèle

```
Baseline predictions   ─┐
XGBoost predictions    ─┤
LSTM predictions       ─┼──► Meta-model (Ridge Regression) ──► Prédiction finale
Transformer predictions─┘

Un méta-modèle par horizon (3 au total)
= 3 méta-modèles Ridge au total

Avantages :
- Poids appris automatiquement (pas de tuning manuel)
- XGBoost fort @15min, LSTM/Transformer fort @60min → complémentaires
- Robuste si un sous-modèle est indisponible (fallback weighted average)
```

### Scores de confiance de l'ensemble
```python
# Accord entre les modèles = haute confiance
y_hats = [y_baseline, y_xgboost, y_lstm, y_transformer]
confidence = 1 - (std(y_hats) / mean(y_hats + epsilon))
confidence = clip(confidence, 0.0, 1.0)
```

### Fallback si un modèle est absent
```
Tous disponibles  → Ensemble stacking (0.10 / 0.30 / 0.30 / 0.30)
Sans Transformer  → 0.15 × Baseline + 0.40 × XGBoost + 0.45 × LSTM
Sans LSTM         → 0.15 × Baseline + 0.40 × XGBoost + 0.45 × Transformer
Sans XGBoost      → 0.15 × Baseline + 0.40 × LSTM + 0.45 × Transformer
Seul Baseline     → status = "low_confidence"
```

---

## 6. Métriques d'évaluation

| Métrique | Description | Objectif |
|---|---|---|
| **MAE** | Mean Absolute Error (mg/dL) | < 15 mg/dL à 30 min |
| **RMSE** | Root Mean Square Error (mg/dL) | < 20 mg/dL à 30 min |
| **MARD** | Mean Absolute Relative Difference (%) | < 10% |
| **TIR** | Time In Range (70-180 mg/dL) | > 70% des prédictions utiles |
| **Hypo recall** | Taux de détection des épisodes < 70 mg/dL | > 90% |
| **Hyper recall** | Taux de détection des épisodes > 180 mg/dL | > 85% |
| **Coverage 80%** | P(y_true ∈ [p10, p90]) | ~80% |

### Clarke Error Grid Analysis (EGA)
Standard clinique pour la glycémie prédictive :
- **Zone A** : erreur cliniquement acceptable (objectif > 95%)
- **Zone B** : erreur bénigne
- **Zone C/D/E** : erreur potentiellement dangereuse (objectif = 0%)

---

## 7. Résumé comparatif attendu

| Modèle | MAE @15min | MAE @30min | MAE @60min |
|---|---|---|---|
| Persistence (borne inf) | ~8 mg/dL | ~15 mg/dL | ~25 mg/dL |
| Baseline LR | ~7 mg/dL | ~13 mg/dL | ~22 mg/dL |
| **XGBoost** | **~4.5 mg/dL** | ~8.5 mg/dL | ~16 mg/dL |
| LSTM | ~5 mg/dL | ~9 mg/dL | ~15 mg/dL |
| Transformer | ~4.5 mg/dL | ~8 mg/dL | ~13.5 mg/dL |
| **Ensemble** | **~3.8 mg/dL** | **~7.2 mg/dL** | **~12.5 mg/dL** |

*Valeurs cibles basées sur la littérature (Ohio T1DM dataset benchmarks).*

> XGBoost rivalise avec le Transformer @15min pour un coût d'entraînement 30× inférieur.
