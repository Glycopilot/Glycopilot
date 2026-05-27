import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import type { LinkedPatient } from '../../types/proche.types';

interface Props {
  readonly patient: LinkedPatient | null;
  readonly loading: boolean;
  readonly onRefresh?: () => Promise<void>;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })} à ${d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function ProcheLocationView({
  patient,
  loading,
  onRefresh,
}: Readonly<Props>): React.JSX.Element {
  const [refreshing, setRefreshing] = React.useState(false);
  const loc = patient?.last_location ?? null;
  const patientName = patient
    ? `${patient.first_name} ${patient.last_name}`
    : 'Votre proche';

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (!loc) {
    return (
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondary}
          />
        }
      >
        <View style={styles.emptyIcon}>
          <MapPin size={48} color="#D1D5DB" strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>Localisation non partagée</Text>
        <Text style={styles.emptyText}>
          {patientName} n'a pas encore partagé sa position.{'\n'}
          La dernière localisation connue sera affichée ici.
        </Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.mapFallback}>
        <MapPin size={44} color={colors.secondary} />
        <Text style={styles.mapTitle}>Carte non disponible sur le web</Text>
        <Text style={styles.mapCoords}>
          {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
        </Text>
      </View>

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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 20,
  },
  mapFallback: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F7',
    gap: 8,
  },
  mapTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  mapCoords: { fontSize: 13, color: colors.textSecondary },
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  infoCoords: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  infoDate: { fontSize: 14, color: '#6B7280', flex: 1 },
  infoHint: { fontSize: 12, color: '#D1D5DB', marginTop: 12, lineHeight: 16 },
});
