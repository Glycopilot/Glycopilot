"""
GlycoPilot - Data Preprocessing Module
Préparation des données glycémiques pour les modèles d'IA
"""

import pandas as pd
import numpy as np
from typing import Tuple, List, Optional
from datetime import datetime


class GlucoseDataPreprocessor:
    """
    Preprocesseur pour les données de glycémie.
    Compatible avec les données du patch CGM et du backend GlycoPilot.
    """
    
    def __init__(self):
        self.feature_columns = [
            'glucose',
            'hr_mean_5min',
            'hr_std_5min',
            'temp_mean_5min',
            'temp_std_5min',
            'hrv_rmssd_5min',
            'glucose_lag_5min',
            'glucose_lag_15min',
            'glucose_lag_30min',
            'glucose_lag_60min',
            'glucose_rolling_mean_15min',
            'glucose_rolling_std_15min',
            'glucose_rolling_mean_30min',
            'glucose_rolling_std_30min',
            'glucose_rolling_mean_60min',
            'glucose_rolling_std_60min',
            'glucose_roc',
            'hba1c',
            'gender_is_female'
        ]
        
    def load_data(self, filepath: str) -> pd.DataFrame:
        """
        Charger les données depuis un fichier CSV
        
        Args:
            filepath: Chemin vers le fichier CSV
            
        Returns:
            DataFrame avec les données chargées
        """
        df = pd.read_csv(filepath)
        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('datetime').reset_index(drop=True)
        return df
    
    def create_lag_features(self, df: pd.DataFrame, column: str = 'glucose') -> pd.DataFrame:
        """
        Créer des features de lag (valeurs passées)
        
        Args:
            df: DataFrame avec les données
            column: Colonne pour laquelle créer les lags
            
        Returns:
            DataFrame avec les features de lag ajoutées
        """
        df = df.copy()
        
        # Lags en minutes (1 mesure = 5 min)
        lag_minutes = [5, 15, 30, 60]
        
        for lag_min in lag_minutes:
            lag_steps = lag_min // 5  # Convertir minutes en nombre de pas
            df[f'{column}_lag_{lag_min}min'] = df[column].shift(lag_steps)
        
        return df
    
    def create_rolling_features(self, df: pd.DataFrame, column: str = 'glucose') -> pd.DataFrame:
        """
        Créer des features de rolling window (moyennes mobiles)
        
        Args:
            df: DataFrame avec les données
            column: Colonne pour laquelle créer les rolling features
            
        Returns:
            DataFrame avec les rolling features ajoutées
        """
        df = df.copy()
        
        # Windows en minutes
        windows = [15, 30, 60]
        
        for window_min in windows:
            window_steps = window_min // 5
            
            # Moyenne mobile
            df[f'{column}_rolling_mean_{window_min}min'] = (
                df[column].rolling(window=window_steps, min_periods=1).mean()
            )
            
            # Écart-type mobile
            df[f'{column}_rolling_std_{window_min}min'] = (
                df[column].rolling(window=window_steps, min_periods=1).std()
            )
        
        return df
    
    def create_rate_of_change(self, df: pd.DataFrame, column: str = 'glucose') -> pd.DataFrame:
        """
        Calculer le taux de variation (rate of change)
        
        Args:
            df: DataFrame avec les données
            column: Colonne pour laquelle calculer le ROC
            
        Returns:
            DataFrame avec la feature ROC ajoutée
        """
        df = df.copy()
        df[f'{column}_roc'] = df[column].diff()
        return df
    
    def create_target(self, df: pd.DataFrame, 
                     target_minutes: int = 30,
                     column: str = 'glucose') -> pd.DataFrame:
        """
        Créer la variable cible (glycémie future)
        
        Args:
            df: DataFrame avec les données
            target_minutes: Minutes dans le futur à prédire
            column: Colonne à utiliser comme target
            
        Returns:
            DataFrame avec la target ajoutée
        """
        df = df.copy()
        target_steps = target_minutes // 5
        df[f'{column}_target_{target_minutes}min'] = df[column].shift(-target_steps)
        return df
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Pipeline complet de création de features
        
        Args:
            df: DataFrame brut
            
        Returns:
            DataFrame avec toutes les features créées
        """
        df = df.copy()
        
        # Créer les features
        df = self.create_lag_features(df)
        df = self.create_rolling_features(df)
        df = self.create_rate_of_change(df)
        df = self.create_target(df)
        
        return df
    
    def split_train_test(self, df: pd.DataFrame, 
                         test_size: float = 0.2,
                         temporal: bool = True) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Split train/test avec option temporelle
        
        Args:
            df: DataFrame à splitter
            test_size: Proportion du test set
            temporal: Si True, split temporel (recommandé pour time series)
            
        Returns:
            (train_df, test_df)
        """
        if temporal:
            split_idx = int(len(df) * (1 - test_size))
            train_df = df.iloc[:split_idx].copy()
            test_df = df.iloc[split_idx:].copy()
        else:
            from sklearn.model_selection import train_test_split
            train_df, test_df = train_test_split(df, test_size=test_size, random_state=42)
        
        return train_df, test_df
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Nettoyer les données (valeurs manquantes, outliers)
        
        Args:
            df: DataFrame à nettoyer
            
        Returns:
            DataFrame nettoyé
        """
        df = df.copy()
        
        # Supprimer les valeurs de glycémie invalides
        df = df[(df['glucose'] >= 40) & (df['glucose'] <= 400)]
        
        # Supprimer les lignes avec trop de NaN
        df = df.dropna(subset=self.feature_columns + ['glucose_target_30min'])
        
        return df
    
    def from_backend_format(self, data: List[dict]) -> pd.DataFrame:
        """
        Convertir les données du backend Django en format pour l'IA
        
        Args:
            data: Liste de dictionnaires depuis l'API Django
            
        Returns:
            DataFrame formaté pour l'IA
        """
        df = pd.DataFrame(data)
        
        # Conversion du format backend
        if 'timestamp' in df.columns:
            df.rename(columns={'timestamp': 'datetime'}, inplace=True)
        
        if 'value' in df.columns:
            df.rename(columns={'value': 'glucose'}, inplace=True)
        
        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('datetime').reset_index(drop=True)
        
        return df


def validate_glucose_value(value: float) -> bool:
    """
    Valider qu'une valeur de glycémie est dans les bornes acceptables
    
    Args:
        value: Valeur de glycémie en mg/dL
        
    Returns:
        True si valide, False sinon
    """
    return 40 <= value <= 400


def detect_alert_type(glucose: float, 
                     threshold_hypo: float = 70,
                     threshold_hyper: float = 180) -> Optional[str]:
    """
    Déterminer le type d'alerte basé sur la glycémie
    
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


if __name__ == "__main__":
    # Test du preprocessor
    print("GlycoPilot Data Preprocessor - Test")
    
    preprocessor = GlucoseDataPreprocessor()
    print(f"✅ Features disponibles : {len(preprocessor.feature_columns)}")
    print(f"📋 Liste des features : {preprocessor.feature_columns[:5]}...")
