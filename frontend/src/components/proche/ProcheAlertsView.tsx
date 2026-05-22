import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { AlertTriangle, Bell } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import procheService from '../../services/procheService';
import type { ProcheAlert } from '../../types/proche.types';

type Filter = 'all' | 'critical' | 'high' | 'medium';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'Toutes' },
  { key: 'critical', label: 'Critiques' },
  { key: 'high',     label: 'Élevées' },
  { key: 'medium',   label: 'Moyennes' },
];

function severityColor(s: string): string {
  if (s === 'critical') return '#EF4444';
  if (s === 'high')     return '#F59E0B';
  if (s === 'medium')   return '#6366F1';
  return '#6B7280';
}

function severityLabel(s: string): string {
  if (s === 'critical') return 'Critique';
  if (s === 'high')     return 'Élevée';
  if (s === 'medium')   return 'Moyenne';
  return 'Info';
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function ProcheAlertsView() {
  const [alerts, setAlerts] = useState<ProcheAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    const data = await procheService.getAlerts();
    setAlerts(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visible = filter === 'all'
    ? alerts
    : alerts.filter(a => a.severity === filter);

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.secondary} />}
    >
      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.secondary} />
      ) : visible.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={48} color="#E5E7EB" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Aucune alerte</Text>
          <Text style={styles.emptyText}>Aucune alerte glycémie n'a été déclenchée.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {visible.map((alert, idx) => {
            const color = severityColor(alert.severity);
            return (
              <View key={`${alert.alertId}-${idx}`} style={styles.card}>
                <View style={[styles.severityBar, { backgroundColor: color }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
                      <AlertTriangle size={18} color={color} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertType}>{alert.type.replace(/_/g, ' ')}</Text>
                      <Text style={styles.alertDate}>{formatDateTime(alert.triggeredAt)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
                      <Text style={[styles.badgeText, { color }]}>{severityLabel(alert.severity)}</Text>
                    </View>
                  </View>
                  {alert.message && alert.message !== alert.type && (
                    <Text style={styles.alertMsg}>{alert.message}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  filtersRow: { paddingTop: 16 },
  filtersContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#fff' },

  list: { padding: 16, gap: 10 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  severityBar: { width: 4 },
  cardContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  alertType: {
    fontSize: 14, fontWeight: '700', color: '#111827',
    textTransform: 'capitalize', marginBottom: 2,
  },
  alertDate: { fontSize: 12, color: '#9CA3AF' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  alertMsg: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 18 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#9CA3AF' },
  emptyText: { fontSize: 14, color: '#D1D5DB', textAlign: 'center' },
});
