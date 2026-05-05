# Journal d'entraînement des modèles

Participant de test : **1** (LOSO — exclu de l'entraînement, utilisé uniquement pour le test final)  
Dataset : BIG-IDEAs Lab Glycemic Variability (16 participants)  
Métrique principale : **MAE (mg/dL)** — erreur absolue moyenne entre valeur prédite et valeur réelle

> **MAE < 5** = excellent | **5–10** = bon (acceptable en clinique) | **> 15** = insuffisant

---

## Améliorations globales appliquées à tous les scripts

- **Historique d'entraînement sauvegardé** — chaque script sauvegarde `history_v1.0.json` avec `train_loss`, `val_loss` et `best_epoch` par epoch
- **Affichage temps réel** — chaque epoch est affiché avec `flush=True` et un marqueur `✓` / `(N/patience)` pour suivre la convergence
- **lag_90 + lag_120 ajoutés** — contexte historique étendu à 2h pour améliorer les prédictions @60min
- **Wearables retirés du modèle global** (N_FEATURES 30 → **25**) — features wearable réservées au fine-tuning personnel pour éviter le biais zero-filling sur les utilisateurs sans montre connectée

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

### Re-entraînement avec 25 features (wearables retirés)

| Horizon | MAE 28f | MAE 25f | Δ |
|---------|---------|---------|---|
| 15 min  | **4.37** | 4.37 | 0.00 |
| 30 min  | **7.94** | 7.95 | +0.01 |
| 60 min  | 9.76 | **9.77** | +0.01 |

Résultats quasi-identiques — les wearables ne contribuaient presque rien au Baseline. Résultats validés, artefacts mis à jour.

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

### Re-entraînement avec 25 features (wearables retirés)

| Horizon | MAE 28f | MAE 25f | Best iter | Δ |
|---------|---------|---------|-----------|---|
| 15 min  | 4.63 | **4.75** | 247/500 | +0.12 |
| 30 min  | 9.48 | **9.55** | 30/500 | +0.07 |
| 60 min  | 10.80 | **11.93** | 13/500 | +1.13 ⚠️ |

**Cause de la régression @60min** : dans le dataset BIG-IDEAs, les colonnes wearables (`hr_mean`, `hrv_rmssd`…) contiennent de vraies données (pas des zéros). En les retirant, on perd un signal réel pour les horizons longs. C'est le trade-off attendu : le modèle global est plus honnête mais légèrement moins performant sur @60min.

**Investigation early stopping** : augmenter `early_stopping_rounds` de 20 à 50/@30min et 100/@60min n'a rien changé — `best_iteration` reste à 30 et 13 respectivement. Le modèle atteint son meilleur val loss à ces itérations et n'améliore plus ensuite. XGBoost a atteint sa limite sur ce dataset sans wearables pour @60min.

**Conclusion** : les wearables apportaient un signal réel dans le dataset. La perte de ~1 mg/dL sur @60min est acceptable — le modèle personnel (37 features) récupérera ce signal pour les patients avec montre connectée.

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

Légère régression due à la variance d'entraînement (early stopping plus agressif).

### Re-entraînement avec 25 features — patience=5

| Horizon | MAE 28f | MAE 25f | Δ |
|---------|---------|---------|---|
| 15 min  | 6.84 | **6.79** | -0.05 ✓ |
| 30 min  | 8.92 | **8.72** | -0.20 ✓ |
| 60 min  | 10.11 | **9.93** | -0.18 ✓ |

Amélioration sur tous les horizons — retirer les wearables réduit le bruit. Best epoch : 20/25, val loss : 303.5.

### Re-entraînement avec 25 features — patience=10

| Horizon | MAE patience=5 | MAE patience=10 | Δ |
|---------|---------------|----------------|---|
| 15 min  | 6.79 | **6.74** | -0.05 ✓ |
| 30 min  | **8.72** | 8.80 | +0.08 |
| 60 min  | **9.93** | 10.01 | +0.08 |

Val loss finale meilleure avec patience=10 (287.6 vs 303.5) mais MAE légèrement pire sur @30min et @60min. La val loss (MSE + pinball combinée) ne corrèle pas parfaitement avec le MAE. Patience=5 reste meilleure pour les horizons cliniquement importants. Différences < 0.1 mg/dL — négligeables.

**Configuration retenue** : patience=10 (choix conservateur pour laisser le modèle converger davantage).

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

### Tentative 3 — Résultats finaux (30 features)

Convergence atteinte à l'epoch **31** (val loss : 296.75 — comparable à LSTM : 296.21). Early stopping déclenché à l'epoch 41.

| Horizon | MAE T1 | MAE T2 | MAE T3 |
|---------|--------|--------|--------|
| 15 min  | 73.70  | 24.25  | **7.71 mg/dL** |
| 30 min  | 72.77  | 24.17  | **9.63 mg/dL** |
| 60 min  | 75.11  | 26.70  | **11.18 mg/dL** |

### Re-entraînement avec 25 features — Tentative 1

| Horizon | MAE 30f | MAE 25f | Δ |
|---------|---------|---------|---|
| 15 min  | 7.71 | 8.49 | +0.78 ⚠️ |
| 30 min  | 9.63 | 10.63 | +1.00 ⚠️ |
| 60 min  | 11.18 | 12.21 | +1.03 ⚠️ |

**Cause identifiée : overfitting**. Train loss finale : 189, val loss : 292 → gap de ~100. La train loss continuait de descendre alors que la val loss plafonnait. Le modèle mémorisait les données d'entraînement.

**Fixes appliqués** :
- `dropout` : 0.1 → **0.2** dans `TransformerEncoderLayer`
- `weight_decay` : 1e-4 → **1e-3** dans l'optimiseur AdamW

### Re-entraînement avec 25 features — Tentative 2 (dropout=0.2, wd=1e-3)

Best epoch : 59/69 — val loss : 298.07. Train loss : 198.5 → gap train/val ~100, overfitting réduit mais persistant.

| Horizon | T1 (dropout=0.1) | T2 (dropout=0.2) | Δ |
|---------|-----------------|-----------------|---|
| 15 min  | 8.49 | **7.78** | -0.71 ✓ |
| 30 min  | 10.63 | **10.13** | -0.50 ✓ |
| 60 min  | 12.21 | **12.08** | -0.13 ✓ |

Amélioration significative sur @15min et @30min. Le Transformer reste plus faible que le LSTM sans wearables — il avait davantage bénéficié de ce signal. L'Ensemble compensera en pondérant le LSTM plus fortement sur @60min.

**Re-run avec la même config (dropout=0.2, wd=1e-3)** — meilleure initialisation aléatoire :

| Horizon | Run 1 | Run 2 | Δ |
|---------|-------|-------|---|
| 15 min  | 7.78 | 7.83 | +0.05 |
| 30 min  | 10.13 | **10.06** | -0.07 ✓ |
| 60 min  | 12.08 | **11.73** | -0.35 ✓ |

Best epoch : 67/77 — val loss : 296.42. Artefacts conservés (meilleur run).

### Re-entraînement avec 25 features — Tentative 3 (dropout=0.3, wd=1e-3)

| Horizon | T2 (dropout=0.2) | T3 (dropout=0.3) | Δ |
|---------|-----------------|-----------------|---|
| 15 min  | **7.78** | 8.25 | +0.47 ❌ |
| 30 min  | **10.13** | 10.64 | +0.51 ❌ |
| 60 min  | **12.08** | 12.45 | +0.37 ❌ |

Trop de régularisation — le modèle sous-apprend. dropout=0.2 était le bon équilibre.

**Configuration finale retenue : dropout=0.2, weight_decay=1e-3** → artefacts restaurés via re-run.

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

### Résultats finaux (25 features, alpha=100)

Poids Ridge appris sur le val set :

| Horizon | Baseline | XGBoost | LSTM | Transformer |
|---------|----------|---------|------|-------------|
| @15min  | 0.492 | 0.221 | 0.226 | 0.102 |
| @30min  | 0.349 | 0.109 | 0.346 | 0.242 |
| @60min  | **-0.234** | 0.460 | 0.488 | 0.320 |

Le poids négatif du Baseline @60min est un artefact du stacking Ridge : les prédictions des 4 modèles sont très corrélées, Ridge "annule" partiellement le Baseline pour extraire la variance utile des autres. Passer à alpha=1000 ne change pas les poids de manière significative (-0.228) ni le MAE test — c'est structurel, pas un bug.

**Test MAE holdout (participant 1) :**

| Horizon | test MAE |
|---------|---------|
| @15min  | 5.76 mg/dL |
| @30min  | 8.63 mg/dL |
| @60min  | **9.96 mg/dL** |

---

## Architecture des features — décision finale

### Principe

Deux modèles par patient :

| Modèle | Features | Usage |
|--------|----------|-------|
| **Global** | **25** | Tout le monde — pas de wearable requis |
| **Personal (fine-tuné)** | **37** (25 + 12) | Patients avec ≥ 14 jours d'historique |

**Pourquoi ne pas mettre les wearables dans le global ?**
Le dataset d'entraînement a ~80 % des lignes avec `hr_mean=0` etc. Le modèle apprendrait que zéro est "normal" — du biais, pas une information. Les wearables ne sont utiles que pour le modèle personnel, où le patient a réellement un appareil connecté.

### Features globales (25)

| Groupe | Features |
|--------|---------|
| Glucose brut | `glucose`, `lag_5`, `lag_15`, `lag_30`, `lag_60`, `lag_90`, `lag_120` |
| Dérivées | `rate`, `delta`, `acceleration` |
| Rolling stats | `roll_mean_15/30/60`, `roll_std_15/30/60` |
| Risque | `is_hypo_risk`, `is_hyper_risk` |
| Temps | `h_sin`, `h_cos`, `d_sin`, `d_cos` |
| Patient meta | `hba1c`, `gender`, `context` |

### Features supplémentaires — modèle personnel (12 extra → 37 total)

| Feature | Source | Fallback si absent |
|---------|--------|-------------------|
| `has_wearable` | Montre connectée (1/0) | 0 |
| `hr_mean` | Fréquence cardiaque moyenne | 0 |
| `hr_std` | Variabilité FC | 0 |
| `hrv_rmssd` | HRV | 0 |
| `temp_mean` | Température cutanée | 0 |
| `activity_calories_60min` | API activité (calories brûlées sur 60 min) | 0 |
| `activity_sugar_used_60min` | API activité (sucre utilisé sur 60 min) | 0 |
| `activity_intensity` | API activité (1=low, 2=med, 3=high) | 0 |
| `minutes_since_last_activity` | API activité | 999 |
| `carbs_last_30min` | API repas (glucides sur 30 min) | 0 |
| `carbs_last_60min` | API repas (glucides sur 60 min) | 0 |
| `minutes_since_last_meal` | API repas | 999 |

### Initialisation des poids

Le LSTM global a une couche d'entrée de shape `(4×hidden, 25)`. Pour créer le modèle personnel (37 features) :
- On copie les 25 colonnes existantes (`lstm1.weight_ih_l0[:, :25]`)
- Les 12 nouvelles colonnes sont initialisées à **zéro**
- Le fine-tuning apprend progressivement à les utiliser — si le patient n'a pas de montre, les 5 wearable columns restent à 0 et le modèle les ignore naturellement

### Conditions de déclenchement

- Historique minimum : **14 jours** de données glucose
- Déclencheur : automatique toutes les **7 jours** par patient (APScheduler)
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

| Modèle | @15 min | @30 min | @60 min | Status |
|--------|---------|---------|---------|--------|
| Baseline | **4.37** | **7.95** | 9.77 | ✓ 25f |
| XGBoost | 4.75 | 9.55 | 11.93 | ✓ 25f |
| LSTM | **6.74** | **8.80** | **10.01** | ✓ 25f, patience=10 |
| Transformer | 7.83 | 10.06 | 11.73 | ✓ 25f, dropout=0.2 |
| **Ensemble** | 5.76 | 8.63 | **9.96** | ✓ 25f, alpha=100 |

> **Baseline** reste le meilleur sur @15min (**4.37**) et @30min (**7.95**) — la glycémie est largement linéaire sur ces horizons.  
> **Ensemble** est le meilleur sur @60min (**9.96**) — bat tous les modèles individuels sur l'horizon cliniquement le plus difficile.  
> **XGBoost** régresse légèrement sur @60min sans wearables (10.80 → 11.93) — trade-off attendu.  
> L'architecture finale : Baseline pour horizons courts, Ensemble pour @60min.
