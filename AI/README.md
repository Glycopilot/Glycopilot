# GlycoPilot - Module IA

Module d'intelligence artificielle pour la prédiction de glycémie à 30 minutes avec détection d'alertes hypo/hyperglycémie.

## Résultats MVP

**Baseline XGBoost (Avril 2026)**

| Métrique | Résultat | Objectif | Statut |
|----------|----------|----------|--------|
| MAE | 13.21 mg/dL | < 15 | ✅ |
| Recall Hyperglycémie | 95.0% | > 95% | ✅ |
| Recall Hypoglycémie | 83.3% | > 95% | ⚠️ |

**Stratégie**
- Split par patient (12 train, 4 test jamais vus)
- Pondération extrême (x2000 hypo, x500 hyper)
- Seuils optimisés (116 mg/dL hypo, 120 mg/dL hyper)

## Structure

```
AI/
├── notebooks/
│   └── glycopilot_ai_baseline.ipynb
├── data/
│   └── BIG-IDEAs-Lab-Glycemic-Variability-and-Wearable-Device-Data.csv
├── models/
│   ├── xgboost_model_patient_split.pkl
│   ├── feature_columns.pkl
│   └── optimal_config.pkl
├── src/
│   ├── data_preprocessing.py
│   └── model_inference.py
├── requirements_ai.txt
└── README.md
```

## Installation

```bash
pip install -r AI/requirements_ai.txt
```

## Utilisation du notebook

### VS Code (recommandé)
1. Installer l'extension Jupyter
2. Ouvrir `AI/notebooks/glycopilot_ai_baseline.ipynb`
3. Sélectionner le kernel Python
4. Run les cellules (Shift+Enter)

### Jupyter local
```bash
cd AI/notebooks
jupyter notebook glycopilot_ai_baseline.ipynb
```

## Intégration backend Django

```python
from AI.src.model_inference import get_prediction_service

# Obtenir le service (singleton)
prediction_service = get_prediction_service()

# Préparer les features
features = {
    'glucose': 120.0,
    'hr_mean_5min': 75.0,
    'temp_mean_5min': 36.5,
    # ... autres features
}

# Prédire
result = prediction_service.predict_glucose_30min(features)
# {
#     'predicted_glucose': 142.3,
#     'alert_type': 'HYPER',
#     'confidence': 0.85,
#     'model_version': 'xgboost_v1.0'
# }
```

## Dataset

**Source** : BIG IDEAS Lab - Glycemic Variability and Wearable Device Data

- 36,610 mesures
- 16 participants
- 164 jours
- Fréquence : 5 minutes

**Features principales** :
- `glucose` : Glycémie actuelle (mg/dL)
- `hr_mean_5min` : Fréquence cardiaque
- `temp_mean_5min` : Température corporelle
- `hrv_rmssd_5min` : Variabilité cardiaque
- `glucose_lag_*` : Historique (5/15/30/60 min)
- `glucose_rolling_mean_*` : Moyennes mobiles
- `glucose_roc` : Taux de variation


