# Dataset & Pipeline de Données

## 1. Source du Dataset

**Nom** : BIG-IDEAs Lab — Glycemic Variability and Wearable Device Data  
**Fichier** : `backend/data/datasets/glycemia/BIG-IDEAs-Lab-Glycemic-Variability-and-Wearable-Device-Data.csv`  
**Lignes** : ~36 610 relevés  
**Fréquence** : ~5 minutes (CGM-style)

---

## 2. Colonnes du Dataset

### Données brutes CGM

| Colonne | Type | Description |
|---|---|---|
| `datetime` | string (ISO 8601) | Timestamp du relevé |
| `glucose` | float | Glycémie actuelle (mg/dL) |
| `participant_id` | string | Identifiant du participant (ex: "001") |
| `hba1c` | float | HbA1c du participant (%) |
| `gender_is_female` | int (0/1) | Genre (1 = femme) |

### Données wearable (capteur porté)

| Colonne | Type | Description |
|---|---|---|
| `hr_mean_5min` | float | Fréquence cardiaque moyenne sur 5 min (bpm) |
| `hr_std_5min` | float | Écart-type FC sur 5 min |
| `temp_mean_5min` | float | Température cutanée moyenne (°C) |
| `temp_std_5min` | float | Écart-type température sur 5 min |
| `hrv_rmssd_5min` | float | HRV RMSSD sur 5 min (ms) |

### Features temporelles pré-calculées

| Colonne | Type | Description |
|---|---|---|
| `glucose_lag_5min` | float | Glycémie il y a 5 min |
| `glucose_lag_15min` | float | Glycémie il y a 15 min |
| `glucose_lag_30min` | float | Glycémie il y a 30 min |
| `glucose_lag_60min` | float | Glycémie il y a 60 min |
| `glucose_rolling_mean_15min` | float | Moyenne glissante 15 min |
| `glucose_rolling_std_15min` | float | Écart-type glissant 15 min |
| `glucose_rolling_mean_30min` | float | Moyenne glissante 30 min |
| `glucose_rolling_std_30min` | float | Écart-type glissant 30 min |
| `glucose_rolling_mean_60min` | float | Moyenne glissante 60 min |
| `glucose_rolling_std_60min` | float | Écart-type glissant 60 min |
| `glucose_roc` | float | Rate of change (mg/dL/min) |

### Variable cible

| Colonne | Type | Description |
|---|---|---|
| `glucose_target_30min` | float | **Glycémie réelle dans 30 min** (supervision) |

---

## 3. Cibles à dériver

Le dataset fournit uniquement `glucose_target_30min`. Nous devons dériver les cibles 15 min et 60 min via un décalage temporel :

```python
# Dans le script de preprocessing
df['glucose_target_15min'] = df.groupby('participant_id')['glucose'].shift(-3)   # 3 × 5min = 15min
df['glucose_target_60min'] = df.groupby('participant_id')['glucose'].shift(-12)  # 12 × 5min = 60min
```

---

## 4. Statistiques descriptives (estimées à partir de l'aperçu)

| Métrique | Valeur |
|---|---|
| Participants | ~5-10 |
| Plage glycémie | ~40 – 400 mg/dL |
| Fréquence | ~5 min |
| Durée estimée | Plusieurs semaines par participant |
| HbA1c observés | Variables (normaux, pré-diabétiques, diabétiques) |

---

## 5. Pipeline de traitement des données

### Étape 1 — Chargement et nettoyage

```
CSV brut
  │
  ▼
Parsing datetime → DatetimeIndex
  │
  ▼
Tri chronologique par (participant_id, datetime)
  │
  ▼
Suppression doublons (même participant + même datetime)
  │
  ▼
Gestion des NaN :
  ├── glucose manquant → interpolation linéaire (max 3 gaps consécutifs)
  ├── wearable manquant → remplissage 0 + flag binaire "has_wearable"
  └── target manquante (fin de série) → suppression de la ligne
```

### Étape 2 — Feature engineering

```
Données nettoyées
  │
  ▼
Dérivation des cibles 15min et 60min (shift)
  │
  ▼
Features supplémentaires à calculer :
  ├── delta_glucose = glucose - glucose_lag_5min
  ├── acceleration = glucose_roc - lag(glucose_roc, 1)
  ├── time_of_day_sin = sin(2π × hour / 24)     ← encodage cyclique
  ├── time_of_day_cos = cos(2π × hour / 24)
  ├── day_of_week_sin = sin(2π × weekday / 7)
  ├── day_of_week_cos = cos(2π × weekday / 7)
  ├── is_hypo_risk = (glucose < 80).astype(int)
  └── is_hyper_risk = (glucose > 160).astype(int)
```

### Étape 3 — Construction des séquences (pour LSTM/Transformer)

```
Features tabulaires
  │
  ▼
Fenêtres glissantes de 24 steps (2h @ 5min)
  │
  ▼
Shape : (N_samples, 24, N_features)
  │
  ▼
Targets : [y_15, y_30, y_60] pour chaque sample
```

### Étape 4 — Normalisation

```
StandardScaler par feature (fit sur train uniquement, transform sur val/test)
  │
  ├── Scaler glycémie → sauvegardé dans artifacts/glucose_scaler.pkl
  └── Scaler features → sauvegardé dans artifacts/features_scaler.pkl
```

### Étape 5 — Split train/val/test

Stratégie : **Leave-One-Subject-Out (LOSO)**

- Un participant entier est mis de côté pour le test
- Les autres sont divisés 80/20 temporellement (pas de shuffle — séries temporelles)
- Raison : éviter la fuite de données (data leakage) entre participants

```
Participants : [001, 002, 003, 004, 005, ...]
                                            └── test set (1 participant)
[001, 002, 003, 004]
  ├── 80% chronologique → train
  └── 20% chronologique → validation
```

---

## 6. Features finales du modèle

### Features continues (normalisées)

| Feature | Description |
|---|---|
| `glucose` | Valeur courante |
| `glucose_lag_5/15/30/60` | Valeurs passées |
| `glucose_roc` | Rate of change |
| `delta_glucose` | Différence 5 min |
| `acceleration` | Variation du ROC |
| `glucose_rolling_mean_15/30/60` | Tendances |
| `glucose_rolling_std_15/30/60` | Variabilité |
| `hr_mean_5min` | FC (optionnel) |
| `hr_std_5min` | Variabilité FC (optionnel) |
| `hrv_rmssd_5min` | HRV (optionnel) |
| `temp_mean_5min` | Température (optionnel) |

### Features encodées

| Feature | Description |
|---|---|
| `time_of_day_sin/cos` | Heure encodée cycliquement |
| `day_of_week_sin/cos` | Jour de la semaine |
| `is_hypo_risk` | Flag risque hypo actuel |
| `is_hyper_risk` | Flag risque hyper actuel |
| `has_wearable` | Flag disponibilité wearable |

### Features statiques patient (optionnelles, si disponibles)

| Feature | Description |
|---|---|
| `hba1c` | HbA1c normalisé |
| `gender_is_female` | Genre |

---

## 7. Variables cibles

| Cible | Description | Source |
|---|---|---|
| `y_15` | Glycémie dans 15 min (mg/dL) | Dérivée (shift -3) |
| `y_30` | Glycémie dans 30 min (mg/dL) | Colonne `glucose_target_30min` |
| `y_60` | Glycémie dans 60 min (mg/dL) | Dérivée (shift -12) |

---

## 8. Adaptation pour la production (données réelles Glycopilot)

En production, les données proviennent de `GlycemiaHisto`. Le pipeline doit s'adapter :

| Dataset d'entraînement | Production Glycopilot |
|---|---|
| `glucose` | `GlycemiaHisto.value` |
| `glucose_roc` | `GlycemiaHisto.rate` |
| `datetime` | `GlycemiaHisto.measured_at` |
| `hr_mean_5min` | Non disponible (marqué absent → `has_wearable=0`) |
| Contexte repas | `GlycemiaHisto.context` (fasting, postprandial...) → one-hot encoding |

Le pipeline de features en production recalcule les lags et rolling stats depuis la fenêtre d'entrée reçue dans la requête POST au microservice.
