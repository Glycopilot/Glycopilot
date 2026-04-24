"""
GlycoPilot - Model Inference Module
Module d'inférence pour les prédictions en temps réel dans le backend Django
"""

import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class GlucosePredictionService:
    """
    Service de prédiction de glycémie pour intégration Django.
    Charge le modèle XGBoost et fait des prédictions en temps réel.
    """
    
    def __init__(self, model_path: str, features_path: str):
        """
        Initialiser le service de prédiction
        
        Args:
            model_path: Chemin vers le modèle XGBoost (.pkl)
            features_path: Chemin vers la liste des features (.pkl)
        """
        self.model = None
        self.feature_columns = None
        self.model_path = Path(model_path)
        self.features_path = Path(features_path)
        
        self.load_model()
        
    def load_model(self):
        """Charger le modèle et les features depuis les fichiers"""
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            
            with open(self.features_path, 'rb') as f:
                self.feature_columns = pickle.load(f)
            
            logger.info(f"✅ Modèle chargé depuis {self.model_path}")
            logger.info(f"✅ Features chargées : {len(self.feature_columns)} colonnes")
            
        except FileNotFoundError as e:
            logger.error(f"❌ Fichier modèle non trouvé : {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Erreur lors du chargement du modèle : {e}")
            raise
    
    def predict_glucose_30min(self, features: Dict) -> Dict:
        """
        Prédire la glycémie à 30 minutes
        
        Args:
            features: Dictionnaire avec les features nécessaires
            
        Returns:
            Dictionnaire avec la prédiction et les métadonnées
        """
        try:
            # Créer DataFrame avec les features
            df_features = pd.DataFrame([features])
            
            # Vérifier que toutes les features nécessaires sont présentes
            missing_features = set(self.feature_columns) - set(df_features.columns)
            if missing_features:
                logger.warning(f"⚠️  Features manquantes : {missing_features}")
                # Remplir avec des valeurs par défaut (0 ou NaN)
                for feat in missing_features:
                    df_features[feat] = 0
            
            # S'assurer de l'ordre des colonnes
            X = df_features[self.feature_columns]
            
            # Prédiction
            prediction = self.model.predict(X)[0]
            
            # Déterminer le type d'alerte
            alert_type = self._detect_alert(prediction)
            
            # Niveau de confiance (peut être amélioré avec predict_proba si disponible)
            confidence = self._calculate_confidence(features, prediction)
            
            result = {
                'predicted_glucose': float(prediction),
                'alert_type': alert_type,
                'confidence': confidence,
                'timestamp_prediction': None,  # À remplir par le backend
                'model_version': 'xgboost_v1.0'
            }
            
            logger.info(f"✅ Prédiction : {prediction:.1f} mg/dL - Alerte : {alert_type}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la prédiction : {e}")
            raise
    
    def predict_batch(self, features_list: List[Dict]) -> List[Dict]:
        """
        Prédictions batch (plusieurs à la fois)
        
        Args:
            features_list: Liste de dictionnaires de features
            
        Returns:
            Liste de dictionnaires avec les prédictions
        """
        return [self.predict_glucose_30min(features) for features in features_list]
    
    def _detect_alert(self, glucose: float,
                     threshold_hypo: float = 70,
                     threshold_hyper: float = 180) -> Optional[str]:
        """
        Détecter le type d'alerte basé sur la glycémie prédite
        
        Args:
            glucose: Valeur de glycémie
            threshold_hypo: Seuil hypoglycémie
            threshold_hyper: Seuil hyperglycémie
            
        Returns:
            'HYPO', 'HYPER', ou None
        """
        if glucose < threshold_hypo:
            return 'HYPO'
        elif glucose > threshold_hyper:
            return 'HYPER'
        return None
    
    def _calculate_confidence(self, features: Dict, prediction: float) -> float:
        """
        Calculer un score de confiance pour la prédiction
        (Simplifié pour MVP, peut être amélioré)
        
        Args:
            features: Features utilisées
            prediction: Valeur prédite
            
        Returns:
            Score de confiance entre 0 et 1
        """
        # Simple heuristique basée sur la variabilité récente
        if 'glucose_rolling_std_15min' in features:
            std = features['glucose_rolling_std_15min']
            # Plus la variabilité est faible, plus on est confiant
            confidence = max(0.5, 1.0 - (std / 50))  # Normalisation simple
        else:
            confidence = 0.75  # Confiance par défaut
        
        return round(confidence, 2)
    
    def get_feature_importance(self, top_n: int = 10) -> List[Tuple[str, float]]:
        """
        Obtenir les features les plus importantes du modèle
        
        Args:
            top_n: Nombre de top features à retourner
            
        Returns:
            Liste de tuples (feature_name, importance)
        """
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            feature_importance = list(zip(self.feature_columns, importances))
            feature_importance.sort(key=lambda x: x[1], reverse=True)
            return feature_importance[:top_n]
        return []


class AlertDetectionService:
    """
    Service de détection d'alertes avec logique métier
    """
    
    def __init__(self, 
                 threshold_hypo: float = 70,
                 threshold_hyper: float = 180):
        """
        Initialiser le service d'alertes
        
        Args:
            threshold_hypo: Seuil hypoglycémie en mg/dL
            threshold_hyper: Seuil hyperglycémie en mg/dL
        """
        self.threshold_hypo = threshold_hypo
        self.threshold_hyper = threshold_hyper
    
    def should_alert(self, 
                    current_glucose: float,
                    predicted_glucose: float,
                    trend: str = None) -> Dict:
        """
        Décider si une alerte doit être envoyée
        
        Args:
            current_glucose: Glycémie actuelle
            predicted_glucose: Glycémie prédite à 30min
            trend: Tendance ('rising', 'falling', 'stable')
            
        Returns:
            Dictionnaire avec la décision d'alerte
        """
        alert_needed = False
        alert_type = None
        alert_severity = 'low'
        message = ""
        
        # Détection hypoglycémie
        if predicted_glucose < self.threshold_hypo:
            alert_needed = True
            alert_type = 'HYPO'
            
            if predicted_glucose < 55:
                alert_severity = 'critical'
                message = "⚠️ RISQUE HYPOGLYCÉMIE SÉVÈRE dans 30 min"
            else:
                alert_severity = 'medium'
                message = "⚠️ Risque d'hypoglycémie dans 30 min"
        
        # Détection hyperglycémie
        elif predicted_glucose > self.threshold_hyper:
            alert_needed = True
            alert_type = 'HYPER'
            
            if predicted_glucose > 250:
                alert_severity = 'critical'
                message = "⚠️ RISQUE HYPERGLYCÉMIE SÉVÈRE dans 30 min"
            else:
                alert_severity = 'medium'
                message = "⚠️ Risque d'hyperglycémie dans 30 min"
        
        # Alerte sur tendance rapide même si dans la norme
        elif trend == 'falling' and current_glucose < 90:
            alert_needed = True
            alert_type = 'TREND_WARNING'
            alert_severity = 'low'
            message = "📉 Glycémie en baisse rapide"
        
        return {
            'alert_needed': alert_needed,
            'alert_type': alert_type,
            'severity': alert_severity,
            'message': message,
            'predicted_glucose': predicted_glucose,
            'current_glucose': current_glucose
        }
    
    def calculate_trend(self, glucose_history: List[float]) -> str:
        """
        Calculer la tendance basée sur l'historique récent
        
        Args:
            glucose_history: Liste des dernières valeurs de glycémie (ordre chronologique)
            
        Returns:
            'rising', 'falling', ou 'stable'
        """
        if len(glucose_history) < 3:
            return 'stable'
        
        # Calculer la pente moyenne
        recent_values = glucose_history[-6:]  # 30 dernières minutes
        slope = np.mean(np.diff(recent_values))
        
        if slope > 3:
            return 'rising'
        elif slope < -3:
            return 'falling'
        else:
            return 'stable'


# Singleton pour réutilisation dans Django
_prediction_service = None

def get_prediction_service(model_path: str = None, features_path: str = None) -> GlucosePredictionService:
    """
    Factory pour obtenir le service de prédiction (singleton)
    
    Args:
        model_path: Chemin vers le modèle (si None, utilise le défaut)
        features_path: Chemin vers les features (si None, utilise le défaut)
        
    Returns:
        Instance du GlucosePredictionService
    """
    global _prediction_service
    
    if _prediction_service is None:
        if model_path is None:
            # Chemin par défaut (à adapter selon votre structure)
            model_path = 'AI/models/xgboost_model.pkl'
        if features_path is None:
            features_path = 'AI/models/feature_columns.pkl'
        
        _prediction_service = GlucosePredictionService(model_path, features_path)
    
    return _prediction_service


if __name__ == "__main__":
    # Test du service
    print("GlycoPilot Prediction Service - Test")
    
    # Exemple d'utilisation
    example_features = {
        'glucose': 120,
        'hr_mean_5min': 75,
        'hr_std_5min': 5,
        'temp_mean_5min': 36.5,
        'temp_std_5min': 0.2,
        'hrv_rmssd_5min': 0.08,
        'glucose_lag_5min': 118,
        'glucose_lag_15min': 115,
        'glucose_lag_30min': 110,
        'glucose_lag_60min': 105,
        'glucose_rolling_mean_15min': 116,
        'glucose_rolling_std_15min': 3,
        'glucose_rolling_mean_30min': 113,
        'glucose_rolling_std_30min': 5,
        'glucose_rolling_mean_60min': 110,
        'glucose_rolling_std_60min': 7,
        'glucose_roc': 2,
        'hba1c': 5.5,
        'gender_is_female': 1
    }
    
    print(f"📊 Exemple de features : {len(example_features)} valeurs")
    print("✅ Service prêt pour intégration Django")
