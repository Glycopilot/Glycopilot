import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';
import { GLYCEMIA_TARGET } from '../constants/glycemia.constants';
import predictionService, {
  GlycemiaPrediction,
} from '../services/predictionService';

interface PredictionsScreenProps {
  navigation: { navigate: (screen: string) => void };
}

const SOURCE_LABELS: Record<GlycemiaPrediction['source'], string> = {
  baseline: 'Baseline',
  lstm: 'LSTM',
  transformer: 'Transformer',
  ensemble: 'Ensemble',
};

const STATUS_CONFIG = {
  ok: { label: 'Fiable', color: '#22C55E', bg: '#F0FDF4', icon: CheckCircle },
  low_confidence: { label: 'Faible confiance', color: '#F59E0B', bg: '#FFFBEB', icon: AlertTriangle },
  insufficient_data: { label: 'Données insuffisantes', color: '#6B7280', bg: '#F9FAFB', icon: AlertTriangle },
  error: { label: 'Erreur', color: '#EF4444', bg: '#FEF2F2', icon: AlertTriangle },
};

function getValueColor(value: number | null): string {
  if (value === null) return '#9CA3AF';
  if (value < GLYCEMIA_TARGET.MIN) return '#EF4444';
  if (value > GLYCEMIA_TARGET.MAX) return '#F59E0B';
  return '#22C55E';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RiskBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  const pct = value !== null ? Math.min(Math.round(value * 100), 100) : 0;
  return (
    <View style={riskStyles.row}>
      <Text style={riskStyles.label}>{label}</Text>
      <View style={riskStyles.bar}>
        <View
          style={[riskStyles.fill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[riskStyles.pct, { color }]}>{pct}%</Text>
    </View>
  );
}

const riskStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  label: { fontSize: 12, color: '#6B7280', width: 42 },
  bar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3 },
  pct: { fontSize: 12, fontWeight: '700', width: 34, textAlign: 'right' },
});

function HorizonCard({
  label,
  minutes,
  yHat,
  p10,
  p90,
  riskHypo,
  riskHyper,
}: {
  label: string;
  minutes: number;
  yHat: number | null;
  p10: number | null;
  p90: number | null;
  riskHypo: number | null;
  riskHyper: number | null;
}) {
  const valueColor = getValueColor(yHat);
  const TrendIcon =
    yHat === null
      ? Minus
      : yHat > GLYCEMIA_TARGET.MAX
        ? TrendingUp
        : yHat < GLYCEMIA_TARGET.MIN
          ? TrendingDown
          : Minus;

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.header}>
        <View style={[cardStyles.badge, { backgroundColor: `${valueColor}15` }]}>
          <Clock size={13} color={valueColor} />
          <Text style={[cardStyles.badgeText, { color: valueColor }]}>
            {label}
          </Text>
        </View>
        <TrendIcon size={18} color={valueColor} strokeWidth={2.5} />
      </View>

      <View style={cardStyles.valueRow}>
        <Text style={[cardStyles.value, { color: valueColor }]}>
          {yHat !== null ? Math.round(yHat) : '—'}
        </Text>
        <Text style={[cardStyles.unit, { color: valueColor }]}>mg/dL</Text>
      </View>

      {p10 !== null && p90 !== null && (
        <Text style={cardStyles.range}>
          Intervalle : {Math.round(p10)} – {Math.round(p90)} mg/dL
        </Text>
      )}

      <View style={cardStyles.divider} />

      <RiskBar label="Hypo" value={riskHypo} color="#EF4444" />
      <RiskBar label="Hyper" value={riskHyper} color="#F59E0B" />
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  value: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  unit: { fontSize: 16, fontWeight: '600' },
  range: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },
});

export default function PredictionsScreen({ navigation }: PredictionsScreenProps) {
  const [prediction, setPrediction] = useState<GlycemiaPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const data = await predictionService.getLatest();
    setPrediction(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusCfg = prediction
    ? STATUS_CONFIG[prediction.status] ?? STATUS_CONFIG.error
    : null;

  return (
    <Layout navigation={navigation} currentRoute="Predictions">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement des prédictions...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#007AFF"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Brain size={26} color="#7C3AED" strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.title}>Prédictions IA</Text>
                <Text style={styles.subtitle}>Glycémie estimée par le modèle</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => load(true)}
              activeOpacity={0.7}
            >
              <RefreshCw size={18} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {prediction === null ? (
            <View style={styles.emptyCard}>
              <Brain size={56} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Aucune prédiction disponible</Text>
              <Text style={styles.emptyText}>
                Les prédictions sont générées automatiquement après chaque mesure de
                glycémie (minimum 6 lectures requises).
              </Text>
            </View>
          ) : (
            <>
              {/* Statut du modèle */}
              <View style={[styles.statusCard, { backgroundColor: statusCfg!.bg }]}>
                <View style={styles.statusRow}>
                  <View style={styles.statusLeft}>
                    {React.createElement(statusCfg!.icon, {
                      size: 18,
                      color: statusCfg!.color,
                      strokeWidth: 2,
                    })}
                    <Text style={[styles.statusLabel, { color: statusCfg!.color }]}>
                      {statusCfg!.label}
                    </Text>
                  </View>
                  <Text style={styles.modelBadge}>
                    {SOURCE_LABELS[prediction.source]} {prediction.model_version}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    Générée à {formatTime(prediction.created_at)}
                  </Text>
                  {prediction.confidence !== null && (
                    <Text style={styles.metaText}>
                      Confiance :{' '}
                      <Text style={{ fontWeight: '700', color: statusCfg!.color }}>
                        {Math.round(prediction.confidence * 100)}%
                      </Text>
                    </Text>
                  )}
                  <Text style={styles.metaText}>
                    {prediction.input_readings_count} lectures utilisées
                  </Text>
                </View>
              </View>

              {/* Horizons */}
              <Text style={styles.sectionTitle}>Prévisions</Text>

              <HorizonCard
                label="Dans 15 min"
                minutes={15}
                yHat={prediction.y_hat_15}
                p10={prediction.p10_15}
                p90={prediction.p90_15}
                riskHypo={prediction.risk_hypo_15}
                riskHyper={prediction.risk_hyper_15}
              />
              <HorizonCard
                label="Dans 30 min"
                minutes={30}
                yHat={prediction.y_hat_30}
                p10={prediction.p10_30}
                p90={prediction.p90_30}
                riskHypo={prediction.risk_hypo_30}
                riskHyper={prediction.risk_hyper_30}
              />
              <HorizonCard
                label="Dans 60 min"
                minutes={60}
                yHat={prediction.y_hat_60}
                p10={prediction.p10_60}
                p90={prediction.p90_60}
                riskHypo={prediction.risk_hypo_60}
                riskHyper={prediction.risk_hyper_60}
              />

              {/* Recommandation */}
              {prediction.recommendation && (
                <View style={styles.recommendCard}>
                  <Text style={styles.recommendTitle}>💡 Recommandation</Text>
                  <Text style={styles.recommendText}>
                    {prediction.recommendation}
                  </Text>
                </View>
              )}

              {/* Objectif rappel */}
              <View style={styles.targetCard}>
                <Text style={styles.targetText}>
                  Objectif glycémique : {GLYCEMIA_TARGET.MIN}–{GLYCEMIA_TARGET.MAX} mg/dL
                </Text>
              </View>
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: colors.textSecondary },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusLabel: { fontSize: 14, fontWeight: '700' },
  modelBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaText: { fontSize: 12, color: '#6B7280' },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: 20,
    marginBottom: 12,
  },

  emptyCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  recommendCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  recommendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 6,
  },
  recommendText: { fontSize: 14, color: '#3B82F6', lineHeight: 21 },

  targetCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  targetText: { fontSize: 13, color: '#9CA3AF' },

  bottomPadding: { height: 100 },
});
