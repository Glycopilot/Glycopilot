import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import { useLocation } from '../../hooks/useLocation';

interface LocationTrackerProps {
  readonly onLocationUpdate?: (
    latitude: number,
    longitude: number,
    address: string
  ) => void;
}

export default function LocationTracker(
  props: Readonly<LocationTrackerProps>
): React.JSX.Element {
  const { onLocationUpdate } = props;
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const { getCurrentLocation, reverseGeocode, loading, error } = useLocation();

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const updateLocation = async () => {
      try {
        const coords = await getCurrentLocation();
        const address = await reverseGeocode(coords.latitude, coords.longitude);

        const locationData = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: address || 'Adresse non disponible',
        };

        setCurrentLocation(locationData);

        if (onLocationUpdate && address) {
          onLocationUpdate(coords.latitude, coords.longitude, address);
        }
      } catch (err) {
        Alert.alert(
          'Erreur',
          err instanceof Error ? err.message : 'Erreur de localisation'
        );
        setIsEnabled(false);
      }
    };

    if (isEnabled) {
      updateLocation();
      intervalId = setInterval(updateLocation, 30000);
    } else {
      setCurrentLocation(null);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isEnabled]);

  const toggleSwitch = () => {
    setIsEnabled(previousState => !previousState);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Navigation size={20} color={colors.textPrimary} />
          <Text style={styles.title}>Localisation </Text>
        </View>
        <Switch
          trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
          thumbColor={isEnabled ? '#007AFF' : '#f4f3f4'}
          ios_backgroundColor="#D1D5DB"
          onValueChange={toggleSwitch}
          value={isEnabled}
        />
      </View>

      {isEnabled && (
        <View style={styles.locationContainer}>
          {loading && !currentLocation && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>
                Récupération de la position...
              </Text>
            </View>
          )}

          {!loading && currentLocation && (
            <>
              <View style={styles.mapContainer}>
                <View style={styles.mapFallback}>
                  <MapPin size={32} color={colors.textSecondary} />
                  <Text style={styles.mapFallbackText}>
                    Carte non disponible sur le web
                  </Text>
                  <Text style={styles.addressText}>
                    {currentLocation.address}
                  </Text>
                </View>
              </View>

              <View style={styles.coordsCompact}>
                <Text style={styles.coordsText}>
                  {currentLocation.latitude.toFixed(6)},{' '}
                  {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>

              <View style={styles.updateInfo}>
                <Text style={styles.updateText}>
                  ⟳ Mise à jour automatique toutes les 30s
                </Text>
              </View>
            </>
          )}

          {!loading && error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  locationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    height: 200,
  },
  mapFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  mapFallbackText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 13,
  },
  addressText: {
    marginTop: 8,
    color: colors.textPrimary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  coordsCompact: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  coordsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  updateInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  updateText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
  },
});
