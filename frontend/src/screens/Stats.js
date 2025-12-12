import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import GlycemieChart from '../components/dashboard/GlycemieChart';
import glycemiaService from '../services/glycemiaService';
import { colors } from '../themes/colors';
import useUser from '../hooks/useUser';

export default function StatsScreen({ navigation }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentMeasures, setRecentMeasures] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentValue, setCurrentValue] = useState(0);

  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      user.email ||
      'Utilisateur'
    : 'Utilisateur';

  // Formater la date
  const formatDate = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleDateString('fr-FR', { month: 'long' });
    const year = today.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Charger les données
  const loadData = async () => {
    try {
      // Charger les 5 dernières mesures
      const history = await glycemiaService.getHistory({ limit: 5 });
      setRecentMeasures(history);

      // Calculer les statistiques sur le mois
      const monthHistory = await glycemiaService.getMonthHistory();
      if (monthHistory.length > 0) {
        const values = monthHistory.map(item => item.value);
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Calculer le pourcentage dans la cible (70-180 mg/dL)
        const inRange = values.filter(v => v >= 70 && v <= 180).length;
        const timeInRange = ((inRange / values.length) * 100).toFixed(0);

        // Calculer l'écart type (variabilité glycémique)
        const variance =
          values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) /
          values.length;
        const stdDev = Math.sqrt(variance);

        // Calculer tendance (comparer les 15 derniers jours vs 15 premiers)
        const midPoint = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, midPoint);
        const secondHalf = values.slice(midPoint);
        const firstAvg =
          firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg =
          secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const trend =
          secondAvg > firstAvg
            ? 'up'
            : secondAvg < firstAvg
              ? 'down'
              : 'stable';

        setStats({
          average: average.toFixed(0),
          min,
          max,
          timeInRange,
          stdDev: stdDev.toFixed(0),
          count: values.length,
          trend,
          trendValue: Math.abs(secondAvg - firstAvg).toFixed(0),
        });

        // Valeur actuelle = dernière mesure
        setCurrentValue(history[0]?.value || 0);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Déterminer la couleur selon la valeur glycémique
  const getGlycemiaColor = value => {
    if (value < 70) return '#E74C3C'; // Hypoglycémie - Rouge
    if (value > 180) return '#E67E22'; // Hyperglycémie - Orange
    return '#27AE60'; // Normal - Vert
  };

  // Formater la date/heure
  const formatDateTime = dateString => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    const time = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) {
      return `Aujourd'hui à ${time}`;
    }

    const dateStr = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
    return `${dateStr} à ${time}`;
  };

  if (loading) {
    return (
      <Layout
        navigation={navigation}
        currentRoute="Stats"
        userName="Utilisateur"
        onNotificationPress={() => console.log('Notifications')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9F1C" />
          <Text style={styles.loadingText}>Chargement des statistiques...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      navigation={navigation}
      currentRoute="Stats"
      userName={displayName}
      onNotificationPress={() => console.log('Notifications')}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF9F1C"
          />
        }
      >
        {/* Banner personnalisé */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.greeting}>
              Bonjour {displayName.split(' ')[0]} !
            </Text>
            <Text style={styles.bannerTitle}>
              Voici votre récapitulatif du mois
            </Text>
          </View>
          <View style={styles.dateContainer}>
            <Calendar size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.dateText}>{formatDate()}</Text>
          </View>
        </View>

        {/* Section header - Stats */}
        <View style={styles.sectionHeader}>
          <BarChart3 size={20} color="#8E8E93" strokeWidth={2.5} />
          <Text style={styles.sectionHeaderText}>Stats</Text>
        </View>

        <View style={styles.container}>
          {/* Récapitulatif 30 jours */}
          {stats && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleContainer}>
                  <BarChart3 size={20} color="#FF9F1C" strokeWidth={2.5} />
                  <Text style={styles.summaryTitle}>
                    Récapitulatif 30 jours
                  </Text>
                </View>
                <View style={styles.measuresBadge}>
                  <Text style={styles.measuresCount}>
                    {stats.count} mesures
                  </Text>
                </View>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <View style={styles.summaryIconContainer}>
                    <Activity size={20} color="#FF9F1C" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.summaryValue}>{stats.average}</Text>
                  <Text style={styles.summaryLabel}>Moyenne</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryIconContainer,
                      { backgroundColor: '#E8F5E9' },
                    ]}
                  >
                    <Target size={20} color="#27AE60" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.summaryValue, { color: '#27AE60' }]}>
                    {stats.timeInRange}%
                  </Text>
                  <Text style={styles.summaryLabel}>Dans cible</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <View style={styles.summaryIconContainer}>
                    {stats.trend === 'up' ? (
                      <TrendingUp size={20} color="#E74C3C" strokeWidth={2.5} />
                    ) : stats.trend === 'down' ? (
                      <TrendingDown
                        size={20}
                        color="#27AE60"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Activity size={20} color="#8E8E93" strokeWidth={2.5} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          stats.trend === 'up'
                            ? '#E74C3C'
                            : stats.trend === 'down'
                              ? '#27AE60'
                              : '#8E8E93',
                      },
                    ]}
                  >
                    {stats.trend === 'stable' ? '→' : `${stats.trendValue}`}
                  </Text>
                  <Text style={styles.summaryLabel}>Tendance</Text>
                </View>
              </View>
            </View>
          )}

          {/* Chart de tendance avec tooltip info */}
          <View style={styles.chartContainer}>
            <GlycemieChart currentValue={currentValue} />
            <View style={styles.tooltipInfo}>
              <Zap size={16} color="#2196F3" strokeWidth={2.5} />
              <Text style={styles.tooltipText}>
                Maintenez votre glycémie entre 70-180 mg/dL pour un meilleur
                contrôle
              </Text>
            </View>
          </View>

          {/* Statistiques détaillées en grille */}
          {stats && (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View
                    style={[styles.statIconBg, { backgroundColor: '#FFEBEE' }]}
                  >
                    <TrendingUp size={18} color="#E67E22" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.statLabel}>Maximum</Text>
                </View>
                <Text style={[styles.statValue, { color: '#E67E22' }]}>
                  {stats.max}
                </Text>
                <Text style={styles.statUnit}>mg/dL</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View
                    style={[styles.statIconBg, { backgroundColor: '#FFEBEE' }]}
                  >
                    <TrendingDown size={18} color="#E74C3C" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.statLabel}>Minimum</Text>
                </View>
                <Text style={[styles.statValue, { color: '#E74C3C' }]}>
                  {stats.min}
                </Text>
                <Text style={styles.statUnit}>mg/dL</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View
                    style={[styles.statIconBg, { backgroundColor: '#FFF9F0' }]}
                  >
                    <BarChart3 size={18} color="#FF9F1C" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.statLabel}>Variabilité</Text>
                </View>
                <Text style={styles.statValue}>{stats.stdDev}</Text>
                <Text style={styles.statUnit}>écart-type</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View
                    style={[
                      styles.statIconBg,
                      {
                        backgroundColor:
                          stats.stdDev <= 36 ? '#E8F5E9' : '#FFF3E0',
                      },
                    ]}
                  >
                    <Activity
                      size={18}
                      color={stats.stdDev <= 36 ? '#27AE60' : '#E67E22'}
                      strokeWidth={2.5}
                    />
                  </View>
                  <Text style={styles.statLabel}>Stabilité</Text>
                </View>
                <Text
                  style={[
                    styles.statValue,
                    { color: stats.stdDev <= 36 ? '#27AE60' : '#E67E22' },
                  ]}
                >
                  {stats.stdDev <= 36 ? 'Bon' : 'Moyen'}
                </Text>
                <Text style={styles.statUnit}>
                  {stats.stdDev <= 36 ? '≤ 36' : '> 36'}
                </Text>
              </View>
            </View>
          )}

          {/* Dernières mesures */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Dernières mesures</Text>

            {recentMeasures.length === 0 ? (
              <View style={styles.emptyState}>
                <Activity size={48} color="#E0E0E0" strokeWidth={2} />
                <Text style={styles.emptyText}>Aucune mesure enregistrée</Text>
                <Text style={styles.emptySubtext}>
                  Commencez à enregistrer vos glycémies
                </Text>
              </View>
            ) : (
              recentMeasures.map((measure, index) => (
                <View key={measure.id || index} style={styles.measureCard}>
                  <View style={styles.measureLeft}>
                    <View
                      style={[
                        styles.measureIndicator,
                        { backgroundColor: getGlycemiaColor(measure.value) },
                      ]}
                    />
                    <View style={styles.measureInfo}>
                      <Text style={styles.measureValue}>
                        {measure.value} mg/dL
                      </Text>
                      <Text style={styles.measureTime}>
                        {formatDateTime(measure.measured_at)}
                      </Text>
                    </View>
                  </View>

                  {measure.context && (
                    <View style={styles.contextBadge}>
                      <Text style={styles.contextText}>{measure.context}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Card d'informations - Comprendre vos statistiques */}
          {stats && (
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Zap size={18} color="#2196F3" strokeWidth={2.5} />
                <Text style={styles.infoTitle}>
                  Comprendre vos statistiques
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Temps dans la cible :</Text>{' '}
                  L'objectif est de rester au moins 70% du temps entre 70-180
                  mg/dL
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Variabilité :</Text> Un
                  écart-type ≤ 36 mg/dL indique une glycémie stable
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Tendance :</Text> Compare vos 15
                  premiers jours aux 15 derniers pour détecter les évolutions
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Espace pour la navbar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },

  // Banner
  banner: {
    backgroundColor: colors.secondary || '#FF9F1C',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  bannerContent: {
    marginBottom: 12,
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
    marginBottom: 4,
    opacity: 0.9,
  },
  bannerTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 30,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.95,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },

  // Récapitulatif Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
  },
  measuresBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  measuresCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF9F1C',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 8,
  },

  // Chart avec tooltip
  chartContainer: {
    marginTop: 16,
  },
  tooltipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
    gap: 8,
  },
  tooltipText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '500',
    lineHeight: 18,
  },

  // Statistiques en grille
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '47.5%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF9F1C',
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Dernières mesures
  recentSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
    marginBottom: 12,
  },
  measureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  measureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  measureIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  measureInfo: {
    flex: 1,
  },
  measureValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
    marginBottom: 4,
  },
  measureTime: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  contextBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary || '#000000',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // Card d'informations
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 8,
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9F1C',
    marginRight: 10,
    marginTop: 7,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
  },
  bottomPadding: {
    height: 100,
  },
});
