import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Plus, Clock, CheckCircle } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';
import { useMedications } from '../hooks/useMedications';
import { toastError } from '../services/toastService';
import type { MedicationIntake, UserMedication } from '../types/medications.types';
import IntakeCard from '../components/medications/IntakeCard';
import MedSummaryGrid from '../components/medications/MedSummaryGrid';
import NextReminderCard from '../components/medications/NextReminderCard';
import ActiveMedList from '../components/medications/ActiveMedList';
import MedFormModal from '../components/medications/MedFormModal';
import { getIntakeColor, getIntakeLabel, formatDate } from '../components/medications/medications.constants';

// ─── types ────────────────────────────────────────────────────────────────────

type TabType = 'toTake' | 'history';

interface MedicationsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function MedicationsScreen({ navigation }: MedicationsScreenProps) {
  const {
    medications,
    todayIntakes,
    intakeHistory,
    loading,
    refreshing,
    refresh,
    addMedication,
    updateMedication,
    deleteMedication,
    markIntake,
    loadHistory,
  } = useMedications();

  const [currentTab, setCurrentTab] = useState<TabType>('toTake');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMed, setEditingMed] = useState<UserMedication | null>(null);

  // ── computed ──
  const pendingIntakes = useMemo(
    () => todayIntakes.filter(i => i.status === 'pending'),
    [todayIntakes],
  );

  const takenToday = useMemo(
    () => todayIntakes.filter(i => i.status === 'taken').length,
    [todayIntakes],
  );

  const adherenceRate = useMemo(() => {
    const taken = intakeHistory.filter(i => i.status === 'taken').length;
    const nonTaken = intakeHistory.filter(i => i.status === 'missed' || i.status === 'snoozed').length;
    const nowTime = new Date().toTimeString().slice(0, 5);
    const overdueToday = todayIntakes.filter(
      i => i.status === 'pending' && i.scheduled_time.slice(0, 5) < nowTime,
    ).length;
    const total = taken + nonTaken + overdueToday;
    return total > 0 ? Math.round((taken / total) * 100) : 0;
  }, [intakeHistory, todayIntakes]);

  const nextIntake = useMemo(() => {
    const nowTime = new Date().toTimeString().slice(0, 5);
    return pendingIntakes.find(i => i.scheduled_time >= nowTime) ?? pendingIntakes[0] ?? null;
  }, [pendingIntakes]);

  // ── tab ──
  const handleTabSwitch = useCallback(
    (tab: TabType) => {
      setCurrentTab(tab);
      if (tab === 'history') {
        loadHistory().then(() => setHistoryLoaded(true));
      }
    },
    [loadHistory],
  );

  // ── modal ──
  const openEditModal = useCallback((med: UserMedication) => {
    setEditingMed(med);
    setModalVisible(true);
  }, []);

  const openAddModal = useCallback(() => {
    setEditingMed(null);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingMed(null);
  }, []);

  // ── delete ──
  const handleDelete = useCallback(
    (med: UserMedication) => {
      Alert.alert(
        'Supprimer ce médicament',
        `Voulez-vous supprimer "${med.display_name}" ? Cette action est irréversible.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              const ok = await deleteMedication(med.id);
              if (!ok) toastError('Erreur', 'Impossible de supprimer ce médicament.');
            },
          },
        ],
      );
    },
    [deleteMedication],
  );

  // ── intake actions ──
  const handleTake = useCallback(
    async (intake: MedicationIntake) => {
      const ok = await markIntake(intake.id, { action: 'taken' });
      if (!ok) toastError('Erreur', 'Impossible de marquer comme pris.');
    },
    [markIntake],
  );

  const handleSnooze = useCallback(
    async (intake: MedicationIntake) => {
      const snoozeUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const ok = await markIntake(intake.id, { action: 'snoozed', snoozed_until: snoozeUntil });
      if (!ok) toastError('Erreur', 'Impossible de reporter.');
    },
    [markIntake],
  );

  const handleMiss = useCallback(
    async (intake: MedicationIntake) => {
      await markIntake(intake.id, { action: 'missed' });
    },
    [markIntake],
  );

  if (loading) {
    return (
      <Layout navigation={navigation} currentRoute="Home" userName="">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout navigation={navigation} currentRoute="Home" userName="">
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#007AFF" />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Médicaments</Text>
              <Text style={styles.subtitle}>Suivi de vos traitements</Text>
            </View>
          </View>

          <MedSummaryGrid
            takenToday={takenToday}
            totalToday={todayIntakes.length}
            activeCount={medications.filter(m => m.statut).length}
          />

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, currentTab === 'toTake' && styles.tabActive]}
              onPress={() => handleTabSwitch('toTake')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, currentTab === 'toTake' && styles.tabTextActive]}>
                À prendre ({pendingIntakes.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, currentTab === 'history' && styles.tabActive]}
              onPress={() => handleTabSwitch('history')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, currentTab === 'history' && styles.tabTextActive]}>
                Historique
              </Text>
            </TouchableOpacity>
          </View>

          {nextIntake && (
            <NextReminderCard
              nextIntake={nextIntake}
              onViewAll={() => navigation.navigate('Notifications')}
            />
          )}

          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {currentTab === 'toTake' ? 'Doses du jour' : 'Historique des prises'}
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* List */}
          <View style={styles.list}>
            {currentTab === 'toTake' ? (
              todayIntakes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Aucun médicament aujourd'hui</Text>
                  <Text style={styles.emptySubtitle}>
                    Ajoutez un traitement pour commencer le suivi
                  </Text>
                </View>
              ) : (
                todayIntakes.map(intake => (
                  <IntakeCard
                    key={intake.id}
                    intake={intake}
                    onTake={() => handleTake(intake)}
                    onSnooze={() => handleSnooze(intake)}
                    onMiss={() => handleMiss(intake)}
                  />
                ))
              )
            ) : (
              <>
                {historyLoaded && (
                  <View style={styles.adherenceCard}>
                    <Text style={styles.adherenceLabel}>ADHÉSION AU TRAITEMENT</Text>
                    <Text style={styles.adherenceValue}>{adherenceRate}%</Text>
                    <View style={styles.adherenceBadge}>
                      <CheckCircle size={24} color="#fff" strokeWidth={2} />
                    </View>
                  </View>
                )}
                {intakeHistory.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Clock size={40} color="#C7C7CC" strokeWidth={1.5} />
                    <Text style={styles.emptyTitle}>Aucun historique</Text>
                  </View>
                ) : (
                  intakeHistory.map(intake => (
                    <View key={intake.id} style={styles.historyCard}>
                      <View style={styles.historyLeft}>
                        <View style={[styles.historyDot, { backgroundColor: getIntakeColor(intake.status) }]} />
                        <View>
                          <Text style={styles.historyName}>{intake.medication_name}</Text>
                          <Text style={styles.historyMeta}>
                            {formatDate(intake.scheduled_date)} · {intake.scheduled_time.slice(0, 5)}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${getIntakeColor(intake.status)}20` }]}>
                        <Text style={[styles.statusBadgeText, { color: getIntakeColor(intake.status) }]}>
                          {getIntakeLabel(intake.status)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </View>

          <ActiveMedList
            medications={medications}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onAdd={openAddModal}
          />

          <View style={styles.bottomPadding} />
        </ScrollView>

        <MedFormModal
          visible={modalVisible}
          editingMed={editingMed}
          onClose={closeModal}
          onAdd={addMedication}
          onUpdate={updateMedication}
        />
      </View>
    </Layout>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  tabsRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, gap: 12 },
  tab: { flex: 1, backgroundColor: '#F5F7FA', borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#007AFF' },
  tabText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#007AFF' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  addButton: {
    width: 48, height: 48, backgroundColor: '#007AFF', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  list: { paddingHorizontal: 20, gap: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#8E8E93' },
  emptySubtitle: { fontSize: 14, color: '#AEAEB2', textAlign: 'center' },
  adherenceCard: {
    backgroundColor: colors.secondary, borderRadius: 16, padding: 20, marginBottom: 12,
  },
  adherenceLabel: { color: '#fff', fontWeight: '700', fontSize: 12, opacity: 0.95 },
  adherenceValue: { color: '#fff', marginTop: 8, fontSize: 36, fontWeight: '800' },
  adherenceBadge: {
    position: 'absolute', right: 18, top: 18, width: 40, height: 40,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  historyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
  historyName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  historyMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  bottomPadding: { height: 100 },
});
