import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Pill, CheckCircle, Clock, ChevronLeft } from 'lucide-react-native';
import { colors } from '../themes/colors';
import apiClient from '../services/apiClient';

interface MedEntry {
  id: string;
  name: string;
  dosage: string;
  taken: boolean;
  takenAt: string | null;
  scheduledAt: string;
  active: boolean;
}

interface Props {
  navigation: { navigate: (s: string) => void };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ProcheMedicationsScreen({ navigation }: Props) {
  const [meds, setMeds] = useState<MedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<MedEntry[]>('/doctors/care-team/proche-medications/');
      setMeds(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMeds([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const taken = meds.filter(m => m.taken);
  const pending = meds.filter(m => !m.taken);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('ProcheHome')}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Médicaments</Text>
          <Text style={styles.headerSub}>Suivi du patient</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

    {loading ? (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    ) : (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor="#8B5CF6"
        />
      }
    >
      <Text style={styles.sub}>30 derniers jours · {meds.length} prises</Text>

      {pending.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Clock size={16} color="#D97706" />
            <Text style={[styles.sectionTitle, { color: '#D97706' }]}>
              Non pris ({pending.length})
            </Text>
          </View>
          {pending.map(m => (
            <View key={m.id} style={[styles.card, styles.cardPending]}>
              <View style={styles.iconBox}>
                <Pill size={20} color="#D97706" />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.dosage}>{m.dosage}</Text>
                <Text style={styles.date}>{formatDate(m.scheduledAt)}</Text>
              </View>
              <View style={styles.badgePending}>
                <Text style={styles.badgePendingText}>Non pris</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {taken.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: '#10B981' }]}>
              Pris ({taken.length})
            </Text>
          </View>
          {taken.map(m => (
            <View key={m.id} style={[styles.card, styles.cardTaken]}>
              <View style={[styles.iconBox, styles.iconBoxTaken]}>
                <Pill size={20} color="#10B981" />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.dosage}>{m.dosage}</Text>
                {m.takenAt && (
                  <Text style={styles.date}>
                    {formatDate(m.takenAt)} à {formatTime(m.takenAt)}
                  </Text>
                )}
              </View>
              <CheckCircle size={20} color="#10B981" />
            </View>
          ))}
        </>
      )}

      {meds.length === 0 && (
        <View style={styles.empty}>
          <Pill size={48} color="#D1D5DB" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Aucun médicament</Text>
          <Text style={styles.emptyText}>
            Aucune prise enregistrée sur les 30 derniers jours.
          </Text>
        </View>
      )}
    </ScrollView>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  headerSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sub: { fontSize: 13, color: colors.textSecondary, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 12, marginTop: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardPending: { borderLeftWidth: 3, borderLeftColor: '#FCD34D' },
  cardTaken: { borderLeftWidth: 3, borderLeftColor: '#6EE7B7' },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
  },
  iconBoxTaken: { backgroundColor: '#D1FAE5' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  dosage: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  date: { fontSize: 12, color: '#9CA3AF' },
  badgePending: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  badgePendingText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#9CA3AF' },
  emptyText: { fontSize: 14, color: '#D1D5DB', textAlign: 'center', lineHeight: 20 },
});
