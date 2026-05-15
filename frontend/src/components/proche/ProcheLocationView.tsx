import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../../themes/colors';
import type { LinkedPatient } from '../../types/proche.types';

interface Props {
  readonly patient: LinkedPatient | null;
  readonly loading: boolean;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    + ' à '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function ProcheLocationView({ patient, loading }: Readonly<Props>) {
  const loc = patient?.last_location ?? null;
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Votre proche';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (!loc) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <MapPin size={48} color="#D1D5DB" strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>Localisation non partagée</Text>
        <Text style={styles.emptyText}>
          {patientName} n'a pas encore partagé sa position.{'\n'}
          La dernière localisation connue sera affichée ici.
        </Text>
      </View>
    );
  }

  const region = {
    latitude: loc.lat,
    longitude: loc.lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.root}>
      {/* Carte */}
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        scrollEnabled
        zoomEnabled
      >
        <Marker
          coordinate={{ latitude: loc.lat, longitude: loc.lng }}
          title={patientName}
          description="Dernière position connue"
          pinColor={colors.secondary}
        />
      </MapView>

      {/* Info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <MapPin size={20} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{patientName}</Text>
            <Text style={styles.infoCoords}>
              {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Clock size={20} color="#9CA3AF" />
          </View>
          <Text style={styles.infoDate}>
            Dernière mesure : {formatDateTime(loc.measuredAt)}
          </Text>
        </View>
        <Text style={styles.infoHint}>
          La position est celle de la dernière mesure glycémique du patient.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#9CA3AF', textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#D1D5DB', textAlign: 'center', lineHeight: 20 },

  map: { flex: 1 },

  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  infoCoords: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  infoDate: { fontSize: 14, color: '#6B7280', flex: 1 },
  infoHint: { fontSize: 12, color: '#D1D5DB', marginTop: 12, lineHeight: 16 },
});
