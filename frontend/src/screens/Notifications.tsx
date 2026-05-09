import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, BellOff, CheckCircle, Clock, Pill, Plus } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import alertService from '../services/alertService';
import medicationService from '../services/medicationService';
import { getGlycemiaStatusColor } from '../constants/glycemia.constants';
import { toastSuccess, toastError } from '../services/toastService';
import {
  getIntakeColor,
  getIntakeLabel,
  formatDate,
} from '../components/medications/medications.constants';
import type { AlertEvent } from '../types/alert.types';
import type { MedicationIntake } from '../types/medications.types';

// ─── types ────────────────────────────────────────────────────────────────────

type SectionType = 'alerts' | 'medications';
type AlertFilter = 'all' | 'hypo' | 'hyper';
type IntakeFilter = 'all' | 'overdue' | 'taken' | 'missed' | 'snoozed';

interface NotificationsScreenProps {
  readonly navigation: any;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const MED_BLUE = '#007AFF';
const OVERDUE_COLOR = '#EF4444';

function getRelativeTime(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  return `Il y a ${Math.floor(diffH / 24)}j`;
}

function isOverdueIntake(intake: MedicationIntake): boolean {
  if (intake.status !== 'pending') return false;
  const nowTime = new Date().toTimeString().slice(0, 5);
  const todayDate = new Date().toISOString().slice(0, 10);
  return (
    intake.scheduled_date === todayDate &&
    intake.scheduled_time.slice(0, 5) < nowTime
  );
}

function getIntakeDisplayColor(intake: MedicationIntake): string {
  return isOverdueIntake(intake) ? OVERDUE_COLOR : getIntakeColor(intake.status);
}

function getIntakeDisplayLabel(intake: MedicationIntake): string {
  return isOverdueIntake(intake) ? 'En retard' : getIntakeLabel(intake.status);
}

function getAlertStatusBadge(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case 'TRIGGERED': return { bg: '#FEE2E2', text: '#DC2626', label: 'Déclenchée' };
    case 'SENT':      return { bg: '#FEF3C7', text: '#F59E0B', label: 'Envoyée' };
    case 'ACKED':     return { bg: '#D1FAE5', text: '#10B981', label: 'Acquittée' };
    case 'RESOLVED':  return { bg: '#DBEAFE', text: '#3B82F6', label: 'Résolue' };
    case 'FAILED':    return { bg: '#F3F4F6', text: '#6B7280', label: 'Échouée' };
    default:          return { bg: '#F3F4F6', text: '#6B7280', label: status };
  }
}

const isHypo = (name: string) =>
  name.toLowerCase().includes('hypo') && !name.toLowerCase().includes('hyper');

// ─── FilterBar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  readonly options: { value: string; label: string }[];
  readonly active: string;
  readonly activeColor: string;
  readonly onSelect: (v: string) => void;
}

function FilterBar({ options, active, activeColor, onSelect }: FilterBarProps) {
  return (
    <View style={styles.filterContainer}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.filterButton, active === opt.value && { backgroundColor: activeColor }]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.filterButtonText, active === opt.value && styles.filterButtonTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── AlertsSection ────────────────────────────────────────────────────────────

const ALERT_FILTERS: { value: AlertFilter; label: string }[] = [
  { value: 'all',  label: 'Toutes' },
  { value: 'hypo', label: 'Hypo' },
  { value: 'hyper', label: 'Hyper' },
];

interface AlertsSectionProps {
  readonly alerts: AlertEvent[];
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
  readonly onAck: (id: number) => void;
}

function AlertsSection({ alerts, refreshing, onRefresh, onAck }: AlertsSectionProps) {
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [visibleCount, setVisibleCount] = useState(10);

  const filtered = useMemo(() => {
    if (filter === 'hypo') return alerts.filter(a => isHypo(a.rule_name));
    if (filter === 'hyper') return alerts.filter(a => !isHypo(a.rule_name));
    return alerts;
  }, [alerts, filter]);

  const displayed = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visibleCount;

  const handleFilterChange = (v: string) => {
    setFilter(v as AlertFilter);
    setVisibleCount(10);
  };

  return (
    <>
      <FilterBar
        options={ALERT_FILTERS}
        active={filter}
        activeColor="#FF9F1C"
        onSelect={handleFilterChange}
      />
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9F1C" />
        }
      >
        {displayed.length === 0 ? (
          <View style={styles.emptyState}>
            <BellOff size={48} color="#C7C7CC" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Aucune alerte</Text>
            <Text style={styles.emptySubtitle}>Les alertes de glycémie apparaîtront ici</Text>
          </View>
        ) : (
          <>
            {displayed.map(alert => {
              const badge = getAlertStatusBadge(alert.status);
              const colors = getGlycemiaStatusColor(isHypo(alert.rule_name) ? 50 : 200);
              const canAck = alert.status !== 'ACKED' && alert.status !== 'RESOLVED';
              return (
                <View key={alert.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.bgColor }]}>
                      <AlertTriangle size={20} color={colors.color} strokeWidth={2.5} />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{alert.rule_name}</Text>
                      <Text style={styles.cardSub}>Glycémie : {alert.glycemia_value} mg/dL</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.timeText}>{getRelativeTime(alert.triggered_at)}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      </View>
                    </View>
                    {canAck && (
                      <TouchableOpacity style={styles.ackButton} onPress={() => onAck(alert.id)}>
                        <CheckCircle size={22} color="#10B981" strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
            {remaining > 0 && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => setVisibleCount(v => v + 10)}
                activeOpacity={0.75}
              >
                <Text style={styles.loadMoreText}>
                  Voir {Math.min(10, remaining)} de plus ({remaining} restantes)
                </Text>
                <View style={styles.loadMoreIcon}>
                  <Plus size={20} color="#FF9F1C" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
}

// ─── MedicationsSection ───────────────────────────────────────────────────────

const INTAKE_FILTERS: { value: IntakeFilter; label: string }[] = [
  { value: 'all',     label: 'Tous' },
  { value: 'overdue', label: 'En retard' },
  { value: 'taken',   label: 'Pris' },
  { value: 'missed',  label: 'Manqué' },
  { value: 'snoozed', label: 'Reporté' },
];

interface MedicationsSectionProps {
  readonly intakes: MedicationIntake[];
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

function MedicationsSection({ intakes, loading, refreshing, onRefresh }: MedicationsSectionProps) {
  const [filter, setFilter] = useState<IntakeFilter>('all');

  const filtered = useMemo(() => {
    if (filter === 'overdue') return intakes.filter(isOverdueIntake);
    if (filter === 'all') return intakes;
    return intakes.filter(i => i.status === filter);
  }, [intakes, filter]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={MED_BLUE} />
      </View>
    );
  }

  return (
    <>
      <FilterBar
        options={INTAKE_FILTERS}
        active={filter}
        activeColor={MED_BLUE}
        onSelect={v => setFilter(v as IntakeFilter)}
      />
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MED_BLUE} />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color="#C7C7CC" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Aucun rappel</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'overdue'
                ? 'Aucune prise en retard'
                : "L'historique de vos rappels médicaments apparaîtra ici"}
            </Text>
          </View>
        ) : (
          filtered.map(intake => {
            const color = getIntakeDisplayColor(intake);
            const label = getIntakeDisplayLabel(intake);
            return (
              <View key={`${intake.id}-${intake.status}`} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <Pill size={20} color={color} strokeWidth={2} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{intake.medication_name ?? '—'}</Text>
                    {intake.medication_dosage ? (
                      <Text style={styles.cardSub}>{intake.medication_dosage}</Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <Text style={styles.timeText}>
                        {formatDate(intake.scheduled_date)} · {intake.scheduled_time.slice(0, 5)}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
                        <Text style={[styles.statusText, { color }]}>{label}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const [section, setSection] = useState<SectionType>('alerts');

  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [intakes, setIntakes] = useState<MedicationIntake[]>([]);
  const [intakesLoading, setIntakesLoading] = useState(false);
  const [intakesLoaded, setIntakesLoaded] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async () => {
    const data = await alertService.getHistory();
    setAlerts(data);
  }, []);

  const fetchIntakes = useCallback(async () => {
    setIntakesLoading(true);
    const nowTime = new Date().toTimeString().slice(0, 5);
    const todayDate = new Date().toISOString().slice(0, 10);

    const [history, today] = await Promise.all([
      medicationService.getIntakeHistory(),
      medicationService.getToday(),
    ]);

    // Prises en retard = pending + heure dépassée aujourd'hui
    const overdueToday = today.filter(
      i =>
        i.status === 'pending' &&
        i.scheduled_date === todayDate &&
        i.scheduled_time.slice(0, 5) < nowTime,
    );

    // En retard en premier, puis l'historique (pris/manqué/reporté)
    setIntakes([...overdueToday, ...history]);
    setIntakesLoaded(true);
    setIntakesLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts().finally(() => setAlertsLoading(false));
  }, [fetchAlerts]);

  useEffect(() => {
    if (section === 'medications' && !intakesLoaded) {
      fetchIntakes();
    }
  }, [section, intakesLoaded, fetchIntakes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (section === 'alerts') await fetchAlerts();
    else await fetchIntakes();
    setRefreshing(false);
  }, [section, fetchAlerts, fetchIntakes]);

  const handleAck = useCallback(async (eventId: number) => {
    const success = await alertService.ackAlert(eventId);
    if (success) {
      setAlerts(prev => prev.map(a => (a.id === eventId ? { ...a, status: 'ACKED' } : a)));
      toastSuccess('Alerte acquittée');
    } else {
      toastError('Erreur', "Impossible d'acquitter l'alerte");
    }
  }, []);

  const unackedCount = alerts.filter(
    a => a.status !== 'ACKED' && a.status !== 'RESOLVED',
  ).length;

  if (alertsLoading) {
    return (
      <Layout navigation={navigation} currentRoute="Notifications">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF9F1C" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout navigation={navigation} currentRoute="Notifications">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unackedCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unackedCount}</Text>
          </View>
        )}
      </View>

      {/* Sélecteur de section */}
      <View style={styles.sectionSelector}>
        <TouchableOpacity
          style={[styles.sectionTab, section === 'alerts' && styles.sectionTabAlertActive]}
          onPress={() => setSection('alerts')}
        >
          <AlertTriangle size={15} color={section === 'alerts' ? '#FF9F1C' : '#8E8E93'} />
          <Text style={[styles.sectionTabText, section === 'alerts' && styles.sectionTabAlertText]}>
            Alertes glycémie
          </Text>
          {unackedCount > 0 && (
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{unackedCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sectionTab, section === 'medications' && styles.sectionTabMedActive]}
          onPress={() => setSection('medications')}
        >
          <Pill size={15} color={section === 'medications' ? MED_BLUE : '#8E8E93'} />
          <Text style={[styles.sectionTabText, section === 'medications' && styles.sectionTabMedText]}>
            Rappels méd.
          </Text>
        </TouchableOpacity>
      </View>

      {section === 'alerts' && (
        <AlertsSection
          alerts={alerts}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onAck={handleAck}
        />
      )}
      {section === 'medications' && (
        <MedicationsSection
          intakes={intakes}
          loading={intakesLoading}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </Layout>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E' },
  badge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sectionSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  sectionTabAlertActive: { backgroundColor: '#FFF4E5' },
  sectionTabMedActive: { backgroundColor: '#EBF5FF' },
  sectionTabText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  sectionTabAlertText: { color: '#FF9F1C' },
  sectionTabMedText: { color: MED_BLUE },
  sectionBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  sectionBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  filterButtonText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  filterButtonTextActive: { color: '#FFFFFF' },
  scrollContent: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#8E8E93' },
  emptySubtitle: { fontSize: 14, color: '#AEAEB2', textAlign: 'center', paddingHorizontal: 32 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  cardSub: { fontSize: 14, fontWeight: '500', color: '#3C3C43' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  timeText: { fontSize: 12, color: '#8E8E93' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '600' },
  ackButton: { padding: 8 },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#FF9F1C' },
  loadMoreIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: { height: 100 },
});
