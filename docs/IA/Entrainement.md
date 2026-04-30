# Journal d'entraînement des modèles

Participant de test : **1** (LOSO — exclu de l'entraînement, utilisé uniquement pour le test final)  
Dataset : BIG-IDEAs Lab Glycemic Variability (16 participants)  
Métrique principale : **MAE (mg/dL)** — erreur absolue moyenne entre valeur prédite et valeur réelle

> **MAE < 5** = excellent | **5–10** = bon (acceptable en clinique) | **> 15** = insuffisant

---

## Améliorations globales appliquées à tous les scripts

- **Historique d'entraînement sauvegardé** — chaque script sauvegarde `history_v1.0.json` avec `train_loss`, `val_loss` et `best_epoch` par epoch
- **Affichage temps réel** — chaque epoch est affiché avec `flush=True` et un marqueur `✓` / `(N/patience)` pour suivre la convergence
- **lag_90 + lag_120 ajoutés** (N_FEATURES 28 → 30) — contexte historique étendu à 2h pour améliorer les prédictions @60min

---

## Baseline (Régression Linéaire)

### Résultats initiaux

| Horizon | MAE |
|---------|-----|
| 15 min  | 4.37 mg/dL |
| 30 min  | 7.94 mg/dL |
| 60 min  | 9.76 mg/dL |

Meilleur modèle sur l'horizon court (15 min). La régression linéaire sur les lags et rolling stats suffit pour prédire 15 min à l'avance — résultat attendu en séries temporelles médicales.

### Modifications appliquées

**lag_90 + lag_120 ajoutés** — deux nouvelles features donnant la glycémie 90 min et 120 min en arrière. Ciblé sur l'amélioration du @60min pour les modèles tabulaires qui n'ont accès qu'au dernier timestep.

> Résultats post-modification à compléter après le prochain entraînement.

---

## XGBoost

### Résultats initiaux

| Horizon | MAE |
|---------|-----|
| 15 min  | 4.66 mg/dL |
| 30 min  | 9.56 mg/dL |
| 60 min  | 10.80 mg/dL |

### Modifications appliquées

**Sample weights sur les zones critiques** — le modèle pénalisait uniformément toutes les erreurs sans tenir compte de la dangerosité clinique. Poids ajoutés :

| Zone | Poids |
|------|-------|
| Hypoglycémie critique (< 70 mg/dL) | × 50 |
| Pré-hypoglycémie (70–90 mg/dL) | × 10 |
| Pré-hyperglycémie (160–180 mg/dL) | × 10 |
| Hyperglycémie critique (> 180 mg/dL) | × 50 |

**Early stopping** — `early_stopping_rounds=20` dans le constructeur `XGBRegressor` (API XGBoost 2.x) pour arrêter avant les 500 arbres si la val loss stagne.

**lag_90 + lag_120 ajoutés** — même raison que Baseline.

> Résultats post-modification à compléter après le prochain entraînement.

---

## LSTM

### Résultats initiaux

| Horizon | MAE |
|---------|-----|
| 15 min  | 6.53 mg/dL |
| 30 min  | 8.70 mg/dL |
| 60 min  | 9.94 mg/dL |

### Modifications appliquées

**Adam → AdamW** (`lr=1e-3`, `weight_decay=1e-4`) — meilleure régularisation, réduit l'overfitting.

**Gradient clipping** (`max_norm=1.0`) — stabilise l'entraînement et évite les exploding gradients sur les séquences longues. Déjà présent dans le Transformer, ajouté au LSTM pour cohérence.

**Correction dropout** — `dropout=0.2` sur couches LSTM à `num_layers=1` est ignoré par PyTorch et génère un warning. Supprimé sur les couches LSTM (le `nn.Dropout(0.3)` après la dernière couche est conservé).

**BATCH_SIZE 64 → 256** — 4× moins de batches par epoch, entraînement significativement plus rapide.

**PATIENCE 15 → 5** — early stopping plus agressif pour éviter les runs de plusieurs heures.

**lag_90 + lag_120 ajoutés** (N_FEATURES 28 → 30).

### Résultats après modifications (28 features)

| Horizon | MAE avant | MAE après |
|---------|-----------|-----------|
| 15 min  | 6.53 mg/dL | 6.84 mg/dL |
| 30 min  | 8.70 mg/dL | 8.92 mg/dL |
| 60 min  | 9.94 mg/dL | 10.11 mg/dL |

> Légère régression due à la variance d'entraînement (early stopping plus agressif). À re-mesurer avec les 30 features.

> Résultats avec lag_90/lag_120 (30 features) à compléter.

---

## Transformer

### Tentative 1 — Résultats initiaux

| Horizon | MAE |
|---------|-----|
| 15 min  | 73.70 mg/dL |
| 30 min  | 72.77 mg/dL |
| 60 min  | 75.11 mg/dL |

Le modèle n'a pas convergé. MAE ~73 est comparable à prédire une valeur constante.

**Cause 1** : `patience=5` trop agressif, le Transformer converge plus lentement que le LSTM.  
**Cause 2** : `nhead=8` avec `d_model=64` → 8 dimensions par tête d'attention, insuffisant.

### Modifications — Tentative 2

**nhead : 8 → 4** — chaque tête passe de 8 à 16 dimensions.  
**patience : 5 → 10**  
**epochs : 50 → 100**

### Tentative 2 — Résultats

| Horizon | MAE |
|---------|-----|
| 15 min  | 24.25 mg/dL |
| 30 min  | 24.17 mg/dL |
| 60 min  | 26.70 mg/dL |

Mieux, mais toujours insuffisant. Diagnostic via l'historique : `Best epoch: 100`, val loss = 2049 après 100 epochs — le modèle s'améliorait encore au dernier epoch.

**Cause identifiée** : `CosineAnnealingLR` avec `T_max=100` fait descendre le learning rate à **0** à l'epoch 100. Le modèle ne pouvait plus rien apprendre dans les dernières dizaines d'epochs alors qu'il n'avait pas convergé.

### Modifications — Tentative 3

**CosineAnnealingLR → ReduceLROnPlateau** (`patience=5`, `factor=0.5`) — ne décroît que lorsque la val loss stagne, ne tombe jamais à 0.  
**lr : 1e-4 → 1e-3** — learning rate initial augmenté pour une convergence plus rapide.  
**lag_90 + lag_120 ajoutés** (N_FEATURES 28 → 30).

### Tentative 3 — Résultats finaux

Convergence atteinte à l'epoch **31** (val loss : 296.75 — comparable à LSTM : 296.21). Early stopping déclenché à l'epoch 41.

| Horizon | MAE T1 | MAE T2 | MAE T3 |
|---------|--------|--------|--------|
| 15 min  | 73.70  | 24.25  | **7.71 mg/dL** |
| 30 min  | 72.77  | 24.17  | **9.63 mg/dL** |
| 60 min  | 75.11  | 26.70  | **11.18 mg/dL** |

---

## Ensemble (Ridge Stacking)

Combine les prédictions des 4 modèles via une régression Ridge qui apprend les poids optimaux de chaque sous-modèle.

### Tentative 1 — `alpha=1.0`

Matrice mal conditionnée (prédictions très corrélées entre sous-modèles), poids instables :

```
@15min : [Baseline=0.0, XGBoost=0.70, LSTM=0.34, Transformer=-15.78]
@30min : [Baseline=0.0, XGBoost=0.22, LSTM=0.83, Transformer=-7.68]
@60min : [Baseline=0.0, XGBoost=0.35, LSTM=0.55, Transformer=+29.18]
```

Baseline ignorée (poids=0), Transformer avec poids aberrants.

### Modification appliquée

**alpha : 1.0 → 100.0** — régularisation plus forte pour forcer des poids stables entre sous-modèles corrélés.

> Résultats finaux à compléter après re-entraînement de tous les modèles avec 30 features.

---

## Récapitulatif comparatif (MAE test, mg/dL)

| Modèle | @15 min | @30 min | @60 min | Features |
|--------|---------|---------|---------|----------|
| Baseline | **4.37** | **7.94** | 9.76 | 28 — à re-mesurer |
| XGBoost | 4.66 | 9.56 | 10.80 | 28 — à re-mesurer |
| LSTM | 6.84 | 8.92 | 10.11 | 28 — à re-mesurer |
| Transformer | 7.71 | 9.63 | 11.18 | **30** ✓ |
| Ensemble | *en cours* | *en cours* | *en cours* | — |

> Baseline et XGBoost restent les meilleures références sur les horizons courts grâce à leur simplicité. L'Ensemble final (après retrain complet avec 30 features) devrait améliorer tous les horizons, en particulier le @60min.
