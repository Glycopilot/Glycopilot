import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  LayoutGrid,
  Bell,
  LogOut,
  Calendar,
  Heart,
  Pill,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '../themes/colors';
import GlycemieCard from '../components/dashboard/GlycemieCard';
import StatCard from '../components/dashboard/StatCard';
import ProcheTabBar, { type ProcheTab } from '../components/proche/ProcheTabBar';
import ProcheAlertsView from '../components/proche/ProcheAlertsView';
import ProcheLocationView from '../components/proche/ProcheLocationView';
import ProcheProfileView from '../components/proche/ProcheProfileView';
import { useProche } from '../hooks/useProche';
import { GLYCEMIA_TARGET } from '../constants/glycemia.constants';
import authService from '../services/authService';

interface Props {
  navigation: {
    navigate: (s: string) => void;
    reset?: (c: { index: number; routes: { name: string }[] }) => void;
  };
}

function getGlycemieStatus(value: number): 'normal' | 'low' | 'high' {
  if (value < GLYCEMIA_TARGET.MIN) return 'low';
  if (value > GLYCEMIA_TARGET.MAX) return 'high';
  return 'normal';
}

function severityColor(s: string): string {
  if (s === 'critical') return '#EF4444';
  if (s === 'high')     return '#F59E0B';
  return '#6B7280';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Banner animé ────────────────────────────────────────────────────────────

interface BannerSlide {
  label: string;
  text: string;
  color: string;
  icon: React.ReactNode;
}

interface ProcheBannerProps {
  readonly relation: string;
  readonly glucoseValue: number | null;
  readonly glucoseTrend?: 'rising' | 'falling' | 'flat';
  readonly healthScore?: number | null;
  readonly alertCount: number;
}

function ProcheBanner({ relation, glucoseValue, glucoseTrend, healthScore, alertCount }: ProcheBannerProps) {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const glucoseColor = glucoseValue == null
    ? colors.secondary
    : glucoseValue < GLYCEMIA_TARGET.MIN ? '#EF4444'
    : glucoseValue > GLYCEMIA_TARGET.MAX ? '#F59E0B'
    : '#10B981';

  const glucoseLabel = glucoseValue == null ? 'Aucune mesure'
    : glucoseValue < GLYCEMIA_TARGET.MIN ? 'en hypoglycémie'
    : glucoseValue > GLYCEMIA_TARGET.MAX ? 'en hyperglycémie'
    : 'stable';

  const trendIcon = (() => {
    const p = { size: 20, color: '#fff', strokeWidth: 2.5 };
    if (glucoseTrend === 'rising')  return <TrendingUp {...p} />;
    if (glucoseTrend === 'falling') return <TrendingDown {...p} />;
    return <Minus {...p} />;
  })();

  const healthColor = !healthScore ? colors.secondary
    : healthScore >= 70 ? '#10B981'
    : healthScore >= 40 ? '#F59E0B'
    : '#EF4444';

  const slides: BannerSlide[] = [
    {
      label: `Glycémie de votre ${relation.toLowerCase()}`,
      text: glucoseValue != null ? `${glucoseValue} mg/dL · ${glucoseLabel}` : 'Aucune mesure récente',
      color: glucoseColor,
      icon: trendIcon,
    },
    ...(healthScore != null ? [{
      label: 'Score de santé',
      text: `${Math.round(healthScore)}/100 · ${healthScore >= 70 ? 'Bon' : healthScore >= 40 ? 'Moyen' : 'Attention'}`,
      color: healthColor,
      icon: <Heart size={20} color="#fff" strokeWidth={2.5} fill="#fff" />,
    }] : []),
    ...(alertCount > 0 ? [{
      label: 'Alertes',
      text: `${alertCount} alerte${alertCount > 1 ? 's' : ''} récente${alertCount > 1 ? 's' : ''}`,
      color: '#F59E0B',
      icon: <AlertTriangle size={20} color="#fff" strokeWidth={2.5} />,
    }] : []),
  ];

  const total = slides.length;

  const advance = useCallback(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setIndex(i => (i + 1) % total), 350);
  }, [fadeAnim, total]);

  useEffect(() => {
    const id = setInterval(advance, 5000);
    return () => clearInterval(id);
  }, [advance]);

  const slide = slides[index];
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={[bStyles.container, { backgroundColor: slide.color }]}>
      <Animated.View style={[bStyles.content, { opacity: fadeAnim }]}>
        <View style={bStyles.row}>
          <View style={bStyles.iconBox}>{slide.icon}</View>
          <Text style={bStyles.label} numberOfLines={1}>{slide.label}</Text>
        </View>
        <Text style={bStyles.text} numberOfLines={2}>{slide.text}</Text>
      </Animated.View>
      <View style={bStyles.footer}>
        <View style={bStyles.datePill}>
          <Calendar size={14} color="#fff" strokeWidth={2.5} />
          <Text style={bStyles.dateText}>{today}</Text>
        </View>
        <View style={bStyles.dots}>
          {slides.map((_, i) => (
            <View key={String(i)} style={[bStyles.dot, i === index && bStyles.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const bStyles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  content: { height: 80, justifyContent: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  label: { fontSize: 14, color: '#fff', fontWeight: '500', opacity: 0.9, flex: 1 },
  text: { fontSize: 24, color: '#fff', fontWeight: '700', lineHeight: 30, letterSpacing: -0.4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  dateText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 20, backgroundColor: '#fff' },
});

// ─── Onglet Accueil ───────────────────────────────────────────────────────────

interface HomeTabProps {
  readonly navigation: Props['navigation'];
  readonly onTabChange: (tab: ProcheTab) => void;
}

function HomeTab({ navigation, onTabChange }: HomeTabProps) {
  const { patient, glycemia, dashboard, loading, refreshing, refresh } = useProche();
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const latest = glycemia[0] ?? null;
  const relation = patient?.relation_type || 'proche';
  const latestTrend = (latest?.trend as 'rising' | 'falling' | 'flat' | undefined) ?? undefined;
  const alerts = dashboard?.alerts ?? [];
  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 3);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.secondary} />}
    >
      <ProcheBanner
        relation={relation}
        glucoseValue={latest?.value ?? null}
        glucoseTrend={latestTrend}
        healthScore={dashboard?.healthScore}
        alertCount={alerts.length}
      />

      <View style={styles.sectionHeader}>
        <LayoutGrid size={20} color="#8E8E93" strokeWidth={2.5} />
        <Text style={styles.sectionTitle}>Dashboard</Text>
      </View>

      <GlycemieCard
        value={latest?.value ?? null}
        status={latest ? getGlycemieStatus(latest.value) : undefined}
        timestamp={latest?.measuredAt}
        unit={latest?.unit}
        trend={latestTrend}
        onPress={() => navigation.navigate('ProcheGlycemia')}
      />

      <View style={styles.statsRow}>
        {dashboard?.healthScore != null && (
          <StatCard
            title="Santé"
            icon={Heart}
            iconColor="#EF4444"
            iconBgColor="#FEE2E2"
            value={Math.round(dashboard.healthScore)}
            secondaryValue={100}
            subtitle="Score de santé"
          />
        )}
      </View>

      {dashboard?.medication != null && (
        <View style={styles.medCard}>
          <View style={styles.medHeader}>
            <View style={styles.medIcon}>
              <Pill size={20} color="#8B5CF6" strokeWidth={2} />
            </View>
            <Text style={styles.medTitle}>Prochain médicament</Text>
          </View>
          {dashboard.medication.nextDose ? (
            <View style={styles.medBody}>
              <Text style={styles.medName}>{dashboard.medication.nextDose.name}</Text>
              <Text style={styles.medDosage}>{dashboard.medication.nextDose.dosage}</Text>
              <View style={styles.medBadge}>
                <Text style={styles.medBadgeText}>En attente</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.medEmpty}>Aucune prise prévue</Text>
          )}
        </View>
      )}

      {alerts.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Bell size={20} color="#8E8E93" strokeWidth={2.5} />
            <Text style={styles.sectionTitle}>Alertes glycémie</Text>
            <TouchableOpacity onPress={() => onTabChange('alerts')} style={{ marginLeft: 'auto' }}>
              <Text style={styles.seeAllLink}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.alertsCard}>
            {visibleAlerts.map((alert, idx) => (
              <View
                key={`${alert.alertId ?? idx}`}
                style={[styles.alertRow, idx < visibleAlerts.length - 1 && styles.alertRowBorder]}
              >
                <View style={[styles.alertDot, { backgroundColor: severityColor(alert.severity) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertType}>{alert.type}</Text>
                  <Text style={styles.alertDate}>
                    {formatDate(alert.triggeredAt)} · {formatTime(alert.triggeredAt)}
                  </Text>
                </View>
                <View style={[styles.alertBadge, { backgroundColor: `${severityColor(alert.severity)}18` }]}>
                  <Text style={[styles.alertBadgeText, { color: severityColor(alert.severity) }]}>
                    {alert.severity === 'critical' ? 'Critique' : alert.severity === 'high' ? 'Élevée' : 'Info'}
                  </Text>
                </View>
              </View>
            ))}
            {alerts.length > 3 && (
              <TouchableOpacity style={styles.seeMoreBtn} onPress={() => setShowAllAlerts(v => !v)}>
                <Text style={styles.seeMoreText}>
                  {showAllAlerts ? 'Voir moins' : `Voir ${alerts.length - 3} de plus`}
                </Text>
                <ChevronRight size={14} color={colors.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('ProcheGlycemia')}>
        <View style={styles.historyBtnLeft}>
          <View style={styles.historyIcon}>
            <LayoutGrid size={20} color={colors.secondary} />
          </View>
          <Text style={styles.historyBtnText}>Toutes les mesures</Text>
        </View>
        <ChevronRight size={18} color={colors.secondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('ProcheMedications')}>
        <View style={styles.historyBtnLeft}>
          <View style={[styles.historyIcon, { backgroundColor: '#EDE9FE' }]}>
            <Pill size={20} color="#8B5CF6" />
          </View>
          <View>
            <Text style={styles.historyBtnText}>Suivi des médicaments</Text>
            <Text style={styles.historyBtnSub}>Voir les prises du patient</Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.secondary} />
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── Écran principal avec onglets ─────────────────────────────────────────────

export default function ProcheHome({ navigation }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState<ProcheTab>('home');
  const { patient, loading, dashboard, refresh } = useProche();

  const alertCount = dashboard?.alerts?.length ?? 0;

  const handleLogout = async () => {
    await authService.logout();
    navigation.reset?.({ index: 0, routes: [{ name: 'Login' }] });
    navigation.navigate('Login');
  };

  const headerTitle = (() => {
    if (activeTab === 'alerts')   return 'Alertes';
    if (activeTab === 'location') return 'Localisation';
    if (activeTab === 'profile')  return 'Mon profil';
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Votre proche';
  })();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>
            {activeTab === 'home' ? 'Accès proche' : ''}
          </Text>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>
        {activeTab === 'home' && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Contenu de l'onglet */}
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && (
          <HomeTab navigation={navigation} onTabChange={setActiveTab} />
        )}
        {activeTab === 'alerts' && <ProcheAlertsView />}
        {activeTab === 'location' && (
          <ProcheLocationView patient={patient} loading={loading} onRefresh={refresh} />
        )}
        {activeTab === 'profile' && (
          <ProcheProfileView onLogout={handleLogout} />
        )}
      </View>

      {/* Tab bar */}
      <ProcheTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertCount={alertCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: colors.textSecondary },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#8E8E93' },
  seeAllLink: { fontSize: 13, fontWeight: '600', color: colors.secondary },

  medCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  medIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  medBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  medDosage: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  medBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  medBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  medEmpty: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 16,
  },

  alertsCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  alertRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  alertDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  alertType: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' },
  alertDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  alertBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  alertBadgeText: { fontSize: 12, fontWeight: '700' },
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  seeMoreText: { fontSize: 14, fontWeight: '600', color: colors.secondary },

  historyBtn: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  historyBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center',
  },
  historyBtnText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  historyBtnSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
