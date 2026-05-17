import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { MapPin, AlertTriangle, CheckCircle, RefreshCw, Settings } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../../themes/colors';

export const LOCATION_PROCHE_KEY = '@glycopilot:location_proche_enabled';

export default function LocationConsentCard(): React.JSX.Element {
  const [enabled, setEnabled] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const fetchCoords = useCallback(async () => {
    setFetching(true);
    setGpsError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Permission GPS refusée. Autorise la localisation dans les réglages.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      setGpsError('Impossible de récupérer la position. Réessaie.');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(LOCATION_PROCHE_KEY).then(v => {
      if (v === 'true') {
        setEnabled(true);
        fetchCoords();
      }
    });
  }, [fetchCoords]);

  const toggle = (value: boolean) => {
    setEnabled(value);
    AsyncStorage.setItem(LOCATION_PROCHE_KEY, value ? 'true' : 'false');
    if (value) {
      fetchCoords();
    } else {
      setCoords(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, enabled && styles.iconBoxActive]}>
          <MapPin size={22} color={enabled ? '#007AFF' : '#9CA3AF'} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Localisation d'urgence</Text>
          <View style={styles.statusRow}>
            {enabled
              ? <CheckCircle size={12} color="#10B981" />
              : <AlertTriangle size={12} color="#D97706" />}
            <Text style={[styles.statusText, enabled ? styles.statusOn : styles.statusOff]}>
              {enabled ? 'Activée' : 'Désactivée'}
            </Text>
          </View>
        </View>
        <Switch
          trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
          thumbColor={enabled ? '#007AFF' : '#f4f3f4'}
          ios_backgroundColor="#D1D5DB"
          onValueChange={toggle}
          value={enabled}
        />
      </View>

      {!enabled && (
        <Text style={styles.description}>
          En activant cette option, votre position sera partagée avec vos proches
          lors d'une alerte d'hypo (&lt;70) ou d'hyperglycémie (&gt;180 mg/dL).
        </Text>
      )}

      {enabled && fetching && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Récupération de la position...</Text>
        </View>
      )}

      {enabled && !fetching && gpsError && (
        <View style={styles.errorBox}>
          <View style={styles.errorRow}>
            <AlertTriangle size={14} color="#EF4444" />
            <Text style={styles.errorText}>{gpsError}</Text>
          </View>
          <View style={styles.errorActions}>
            <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.settingsBtn}>
              <Settings size={13} color="#fff" />
              <Text style={styles.settingsBtnText}>Ouvrir les réglages</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={fetchCoords} style={styles.retryBtn}>
              <RefreshCw size={13} color="#007AFF" />
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {enabled && !fetching && coords && (
        <View style={styles.mapWrapper}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={{
              latitude: coords.lat,
              longitude: coords.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled
            zoomEnabled
            showsUserLocation
          >
            <Marker
              coordinate={{ latitude: coords.lat, longitude: coords.lng }}
              title="Votre position"
            >
              <View style={styles.markerOuter}>
                <View style={styles.markerInner} />
              </View>
            </Marker>
          </MapView>
          <View style={styles.coordsRow}>
            <MapPin size={13} color="#007AFF" />
            <Text style={styles.coordsText}>
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: '#EBF5FF',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: { fontSize: 12 },
  statusOn: { color: '#10B981', fontWeight: '600' },
  statusOff: { color: '#D97706' },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  settingsBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  retryText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  mapWrapper: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 8,
  },
  map: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  markerOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,122,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
});
