import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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
      // Récupérer immédiatement la position
      updateLocation();
      // Puis mettre à jour toutes les 30 secondes
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
              {/* Carte interactive */}
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  region={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  showsCompass={true}
                  zoomEnabled={true}
                  scrollEnabled={true}
                  rotateEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    }}
                    title="Votre position"
                    description={currentLocation.address}
                  >
                    <View style={styles.customMarker}>
                      <View style={styles.markerPulse} />
                      <View style={styles.markerDot} />
                    </View>
                  </Marker>
                </MapView>

                {/* Badge de mise à jour en cours */}
                {loading && (
                  <View style={styles.updatingBadge}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.updatingText}>Mise à jour...</Text>
                  </View>
                )}
              </View>

              {/* Coordonnées compactes */}
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
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    height: 200,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  updatingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  addressCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  address: {
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 22,
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
