# GlycoPilot - Module IA 🧠

Module d'intelligence artificielle pour la prédiction de glycémie à 30 minutes avec détection d'alertes hypo/hyperglycémie.

## 📊 Vue d'ensemble

Ce module implémente :
- **XGBoost** : Modèle principal pour prédictions à 30 min (MAE < 15 mg/dL)
- **ARIMA** : Baseline statistique pour comparaison
- **Détection d'alertes** : Hypoglycémie (<70) et Hyperglycémie (>180)
- **API d'inférence** : Prête pour intégration Django

## 📁 Structure

```
AI/
├── notebooks/          # Jupyter notebooks pour recherche
│   └── glycopilot_ai_baseline.ipynb
├── data/              # Datasets (gitignore si >50MB)
│   └── BIG-IDEAs-Lab-*.csv
├── models/            # Modèles entraînés (.pkl)
│   ├── xgboost_model.pkl
│   └── feature_columns.pkl
├── src/               # Code source Python réutilisable
│   ├── __init__.py
│   ├── data_preprocessing.py    # Préparation des données
│   ├── model_training.py        # Entraînement des modèles
│   ├── model_inference.py       # Prédictions temps réel
│   └── alert_detection.py       # Logique d'alertes
├── tests/             # Tests unitaires
│   └── test_model.py
├── requirements_ai.txt  # Dépendances IA
└── README.md          # Ce fichier
```

## 🚀 Installation

### 1. Installer les dépendances IA

```bash
# Depuis la racine du projet
pip install -r AI/requirements_ai.txt
```

### 2. Vérifier l'installation

```python
python -c "import xgboost; import sklearn; print('✅ IA dependencies OK')"
```

## 📓 Utilisation du notebook

### Option 1 : Jupyter local

```bash
cd AI/notebooks
jupyter notebook
# Ouvrir glycopilot_ai_baseline.ipynb
```

### Option 2 : VS Code

1. Installer l'extension "Jupyter" dans VS Code
2. Ouvrir `glycopilot_ai_baseline.ipynb`
3. Sélectionner le kernel Python
4. Run les cellules (Shift+Enter)

### Option 3 : Google Colab

1. Upload le notebook sur Google Drive
2. Ouvrir avec Google Colab
3. Upload le dataset CSV dans Colab

## 🔧 Intégration backend Django

### 1. Importer le service de prédiction

```python
# Dans votre view Django (backend/apps/glycemia/views.py)
from AI.src.model_inference import get_prediction_service

# Obtenir le service (singleton)
prediction_service = get_prediction_service()
```

### 2. Faire une prédiction

```python
# Préparer les features depuis les données patient
features = {
    'glucose': current_reading.value,
    'hr_mean_5min': hr_data.mean(),
    # ... autres features
}

# Prédire la glycémie à 30 min
result = prediction_service.predict_glucose_30min(features)

# Résultat :
# {
#     'predicted_glucose': 142.3,
#     'alert_type': 'HYPER',  # ou 'HYPO' ou None
#     'confidence': 0.85,
#     'model_version': 'xgboost_v1.0'
# }
```

### 3. Créer une alerte si nécessaire

```python
from AI.src.model_inference import AlertDetectionService

alert_service = AlertDetectionService(
    threshold_hypo=70,
    threshold_hyper=180
)

alert = alert_service.should_alert(
    current_glucose=current_reading.value,
    predicted_glucose=result['predicted_glucose'],
    trend='rising'  # calculé depuis l'historique
)

if alert['alert_needed']:
    # Créer une alerte dans le backend
    Alert.objects.create(
        user=user,
        alert_type=alert['alert_type'],
        severity=alert['severity'],
        message=alert['message']
    )
```

## 📊 Dataset utilisé

**Source** : BIG IDEAS Lab - Glycemic Variability and Wearable Device Data

**Caractéristiques** :
- 36,610 mesures de glycémie
- 16 participants (diabète type 1 et prédiabète)
- 164 jours de données continues
- Mesures toutes les 5 minutes
- Features : glycémie, fréquence cardiaque, température, HRV, lags, rolling stats

**Features principales** :
- `glucose` : Glycémie actuelle (mg/dL)
- `hr_mean_5min` : Fréquence cardiaque moyenne
- `temp_mean_5min` : Température corporelle
- `hrv_rmssd_5min` : Variabilité cardiaque (HRV)
- `glucose_lag_*` : Glycémie historique (5, 15, 30, 60 min)
- `glucose_rolling_mean_*` : Moyennes mobiles (15, 30, 60 min)
- `glucose_roc` : Taux de variation (Rate of Change)

## 🎯 Performances MVP

| Modèle | MAE (mg/dL) | RMSE | R² | Recommandation |
|--------|-------------|------|----|----|
| **XGBoost** | ~12-15 | ~18-20 | 0.85+ | ✅ **MVP** |
| ARIMA | ~20-25 | ~28-32 | 0.70 | Baseline |

**Détection d'alertes** :
- F1-Score Hypoglycémie : >0.75
- F1-Score Hyperglycémie : >0.80
- Recall : Priorité donnée (éviter faux négatifs)

## 🔄 Workflow complet

### 1. Entraînement (une fois)

```bash
# Ouvrir le notebook
cd AI/notebooks
jupyter notebook glycopilot_ai_baseline.ipynb

# Exécuter toutes les cellules
# Les modèles seront sauvegardés dans AI/models/
```

### 2. Intégration backend

```python
# Dans backend/apps/glycemia/services.py (à créer)
from AI.src.model_inference import get_prediction_service

class GlycemiaPredictionService:
    def __init__(self):
        self.predictor = get_prediction_service()
    
    def predict_for_user(self, user_id):
        # Récupérer les dernières mesures
        readings = GlucoseReading.objects.filter(user_id=user_id).order_by('-timestamp')[:12]
        
        # Préparer les features
        features = self._prepare_features(readings)
        
        # Prédire
        prediction = self.predictor.predict_glucose_30min(features)
        
        return prediction
```

### 3. Endpoint API

```python
# Dans backend/apps/glycemia/views.py
from rest_framework.decorators import api_view
from .services import GlycemiaPredictionService

@api_view(['GET'])
def predict_glucose(request):
    """Prédire la glycémie à 30 minutes"""
    user_id = request.user.id
    
    service = GlycemiaPredictionService()
    prediction = service.predict_for_user(user_id)
    
    return Response(prediction)
```

## 🧪 Tests

```bash
# Lancer les tests unitaires
pytest AI/tests/

# Avec coverage
pytest AI/tests/ --cov=AI/src --cov-report=html
```

## 📝 TODO / Améliorations futures

- [ ] Déployer le modèle sur le serveur AWS
- [ ] Ajouter des tests d'intégration avec le backend Django
- [ ] Optimiser les hyperparamètres XGBoost avec Grid Search
- [ ] Implémenter LSTM pour comparaison (v2)
- [ ] Ajouter le monitoring des performances du modèle en production
- [ ] Créer un endpoint pour réentraînement automatique
- [ ] Ajouter la prédiction multi-horizon (15min, 45min, 60min)

## 🔒 Sécurité & Privacy

- ⚠️ **Ne jamais commiter de données patients réelles**
- ✅ Utiliser `.gitignore` pour exclure `AI/data/*.csv` si données sensibles
- ✅ Les modèles entraînés (.pkl) peuvent être commités (pas de données patient dedans)

## 👥 Contributeurs

- **Fatimatou** : Implémentation IA baseline (XGBoost, ARIMA, dataset)
- **Équipe Backend** : Intégration Django
- **Équipe Frontend** : Affichage des prédictions

## 📚 Ressources

- [Documentation XGBoost](https://xgboost.readthedocs.io/)
- [Scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html)
- [Time Series Forecasting](https://www.statsmodels.org/stable/tsa.html)

## 📞 Support

Pour toute question sur le module IA :
- Slack : #glycopilot-ia
- Email : [votre email]
- GitHub Issues : Créer une issue avec le tag `AI`

---

**Version** : 1.0.0 (MVP)  
**Dernière mise à jour** : Avril 2026
