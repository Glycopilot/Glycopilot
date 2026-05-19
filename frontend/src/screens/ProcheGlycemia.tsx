import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Droplet } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { colors } from '../themes/colors';
import { useProche } from '../hooks/useProche';
import { GLYCEMIA_TARGET } from '../constants/glycemia.constants';
import GlycemiaChart from '../components/glycemia/GlycemiaChart';

interface Props {
  navigation: { navigate: (s: string) => void };
  patientName?: string;
}

function getStatusColor(value: number): string {
  if (value < GLYCEMIA_TARGET.MIN) return '#EF4444';
  if (value > GLYCEMIA_TARGET.MAX) return '#F59E0B';
  return '#10B981';
}

function getStatusLabel(value: number): string {
  if (value < GLYCEMIA_TARGET.MIN) return 'Hypoglycémie';
  if (value > GLYCEMIA_TARGET.MAX) return 'Hyperglycémie';
  return 'Normal';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ProcheGlycemia({ navigation, patientName }: Readonly<Props>) {
  const { glycemia, loading, refreshing, refresh } = useProche();

  const chartData = useMemo(() => {
    const recent = [...glycemia].sort(
      (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
    ).slice(-24);

    if (recent.length === 0) {
      return { labels: ['--'], datasets: [{ data: [100] }] };
    }
    return {
      labels: recent.map(e => formatTime(e.measuredAt)),
      datasets: [{ data: recent.map(e => e.value) }],
    };
  }, [glycemia]);

  const latest = glycemia[0];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('ProcheHome')}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Glycémie</Text>
          {patientName && <Text style={styles.headerSub}>{patientName}</Text>}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 80 }} size="large" color="#007AFF" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          {/* Valeur actuelle */}
          {latest && (
            <View style={styles.currentCard}>
              <View style={styles.currentLeft}>
                <View style={[styles.dot, { backgroundColor: getStatusColor(latest.value) }]} />
                <View>
                  <Text style={styles.currentLabel}>Dernière mesure</Text>
                  <Text style={styles.currentTime}>
                    {formatDate(latest.measuredAt)} à {formatTime(latest.measuredAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.currentRight}>
                <Text style={[styles.currentValue, { color: getStatusColor(latest.value) }]}>
                  {latest.value}
                </Text>
                <Text style={styles.currentUnit}>{latest.unit}</Text>
                <Text style={[styles.currentStatus, { color: getStatusColor(latest.value) }]}>
                  {getStatusLabel(latest.value)}
                </Text>
              </View>
            </View>
          )}

          {/* Graphique */}
          {glycemia.length > 1 && (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Évolution (24 dernières mesures)</Text>
              <GlycemiaChart chartData={chartData} measurementCount={glycemia.length} />
            </View>
          )}

          {/* Historique */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique</Text>
            {glycemia.length === 0 ? (
              <View style={styles.empty}>
                <Droplet size={32} color="#D1D5DB" strokeWidth={1.5} />
                <Text style={styles.emptyText}>Aucune mesure disponible</Text>
              </View>
            ) : (
              glycemia.slice(0, 30).map((entry, idx) => {
                const statusColor = getStatusColor(entry.value);
                return (
                  <View key={`${entry.measuredAt}-${idx}`} style={styles.row}>
                    <View style={[styles.rowDot, { backgroundColor: statusColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowValue}>
                        {entry.value} <Text style={styles.rowUnit}>{entry.unit}</Text>
                      </Text>
                      {entry.context && (
                        <Text style={styles.rowContext}>{entry.context}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.rowTime}>{formatTime(entry.measuredAt)}</Text>
                      <Text style={styles.rowDate}>{formatDate(entry.measuredAt)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  headerSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  currentCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  currentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  currentLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  currentTime: { fontSize: 12, color: '#9CA3AF' },
  currentRight: { alignItems: 'flex-end' },
  currentValue: { fontSize: 40, fontWeight: '800', lineHeight: 44 },
  currentUnit: { fontSize: 14, color: colors.textSecondary },
  currentStatus: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  section: { marginHorizontal: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowValue: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  rowUnit: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
  rowContext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowTime: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowDate: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
});
