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

### Résultats après modifications V1 (30 features + sample weights + early stopping)

| Horizon | MAE | Best iteration |
|---------|-----|----------------|
| 15 min  | 4.63 mg/dL | 65/500 |
| 30 min  | 9.48 mg/dL | 31/500 |
| 60 min  | 11.17 mg/dL | 20/500 ⚠️ |

Problème identifié : `early_stopping_rounds=20` uniforme → seulement 20 arbres pour @60min (underfitting). Le signal à 60 min est plus bruité et nécessite plus d'arbres pour converger.

### Modifications V2 (basées sur la littérature)

**Early stopping par horizon** — horizons longs ont un signal plus bruité, ils ont besoin de plus d'arbres avant convergence :

| Horizon | early_stopping_rounds |
|---------|----------------------|
| 15 min  | 20 |
| 30 min  | 50 |
| 60 min  | **100** |

**Hyperparamètres par horizon** — la littérature montre qu'arbres moins profonds + learning rate plus élevé améliorent les horizons longs :

| Horizon | max_depth | learning_rate |
|---------|-----------|---------------|
| 15 min  | 6 | 0.05 |
| 30 min  | 5 | 0.08 |
| 60 min  | **4** | **0.12** |

**Sample weights réduits pour @60min** — à 60 min l'incertitude est plus élevée, pénaliser autant les zones critiques nuit au MAE global. Poids critique `×50 → ×30` pour @60min uniquement.

### Résultats V2 — Échec (learning rate trop élevé)

| Horizon | MAE V1 | MAE V2 | Best iter |
|---------|--------|--------|-----------|
| 15 min  | 4.63   | 4.63   | 65/500 |
| 30 min  | 9.48   | 9.99 ❌ | 18/500 |
| 60 min  | 11.17  | 12.64 ❌ | 5/500 |

**Cause** : LR élevé (0.08/0.12) sur signal bruité → val loss oscille davantage → early stopping déclenché encore plus tôt. Le modèle s'arrête à 5 arbres pour @60min au lieu de 20.

**Enseignement** : pour des horizons longs sur données médicales bruitées, un LR plus élevé est contre-productif. La recommandation de la littérature ne s'applique pas ici.

### Modifications V3

**Revert LR → 0.05 pour tous les horizons** — signal trop bruité à 60 min pour supporter un LR élevé.

**Garder max_depth et early_stopping par horizon** — ces deux changements restent valides :

| Horizon | max_depth | learning_rate | early_stopping_rounds |
|---------|-----------|---------------|----------------------|
| 15 min  | 6 | 0.05 | 20 |
| 30 min  | 5 | 0.05 | 50 |
| 60 min  | 4 | 0.05 | **100** |

### Résultats V3 — Échec (max_depth réduit contre-productif)

| Horizon | MAE V1 | MAE V3 | Best iter |
|---------|--------|--------|-----------|
| 15 min  | **4.63** | 4.63 | 65/500 |
| 30 min  | **9.48** | 9.89 ❌ | 31/500 |
| 60 min  | **11.17** | 11.34 ❌ | 17/500 |

**Cause** : réduire `max_depth` (6→5 pour @30min, 6→4 pour @60min) diminue la capacité du modèle → underfitting. Le `best_iteration=17` persiste malgré `early_stopping=100` — XGBoost s'est bien arrêté à l'itération 117, mais le meilleur était déjà à 17. Les arbres supplémentaires ne font qu'overfitter.

**Conclusion** : XGBoost a atteint sa limite sur ce dataset pour @60min (~11 mg/dL). Le LSTM (9.91) est meilleur sur l'horizon long. Config revenue à V1 (max_depth=6, lr=0.05, early_stopping=20 pour tous les horizons).

### Configuration finale retenue : V1

| Horizon | max_depth | learning_rate | early_stopping | MAE final |
|---------|-----------|---------------|----------------|-----------|
| 15 min  | 6 | 0.05 | 20 | **4.63 mg/dL** |
| 30 min  | 6 | 0.05 | 20 | **9.48 mg/dL** |
| 60 min  | 6 | 0.05 | 20 | **11.17 mg/dL** |

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

## Stratégie Fine-tuning par patient

### Principe

Le modèle global (30 features) est entraîné une fois sur tous les participants. Pour chaque patient, un modèle personnel LSTM est fine-tuné sur ses données récentes avec **37 features** (30 globales + 7 nouvelles).

**Avantage** : le modèle s'adapte au métabolisme individuel sans re-entraîner le global. Particulièrement utile pour améliorer le @60min.

### Features supplémentaires (modèle personnel uniquement)

| Feature | Source | Fallback si absent |
|---------|--------|-------------------|
| `activity_calories_60min` | API activité (calories brûlées sur 60 min) | 0 |
| `activity_sugar_used_60min` | API activité (sucre utilisé sur 60 min) | 0 |
| `activity_intensity` | API activité (intensité moyenne : 1=low, 2=med, 3=high) | 0 |
| `minutes_since_last_activity` | API activité | 999 |
| `carbs_last_30min` | API repas (glucides ingérés sur 30 min) | 0 |
| `carbs_last_60min` | API repas (glucides ingérés sur 60 min) | 0 |
| `minutes_since_last_meal` | API repas | 999 |

### Initialisation des poids

Le LSTM global a une couche d'entrée de shape `(4×hidden, 30)`. Pour créer le modèle personnel (37 features) :
- On copie les 30 colonnes existantes
- Les 7 nouvelles colonnes sont initialisées à **zéro**
- Le fine-tuning apprend progressivement à les utiliser

### Conditions de déclenchement

- Historique minimum : **14 jours** de données glucose
- Déclencheur : automatique toutes les **7 jours** par patient
- Données utilisées : les **60 derniers jours**
- Artefacts : `artifacts/patients/{patient_id}/lstm_personal_v1.0.pt`

### Script

```bash
python training/finetune_patient.py --patient-id <uuid> --django-url http://localhost:8000 --token <bearer>
# ou depuis CSV exporté :
python training/finetune_patient.py --patient-id <uuid> --data-csv patient_data.csv
```

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
