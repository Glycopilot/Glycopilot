import { useState } from 'react';
import * as Location from 'expo-location';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface UseLocationReturn {
  getCurrentLocation: () => Promise<LocationCoords>;
  reverseGeocode: (
    latitude: number,
    longitude: number
  ) => Promise<string | null>;
  loading: boolean;
  error: string | null;
}

export const useLocation = (): UseLocationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = async (): Promise<LocationCoords> => {
    setLoading(true);
    setError(null);

    try {
      // Demander la permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        throw new Error('Permission de localisation refusée');
      }

      // Obtenir la position actuelle
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur de localisation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Utiliser l'API française pour la géolocalisation inverse
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/reverse/?lon=${longitude}&lat=${latitude}`
      );

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features[0].properties.label;
      }

      return null;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erreur lors de la récupération de l'adresse";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    getCurrentLocation,
    reverseGeocode,
    loading,
    error,
  };
};
