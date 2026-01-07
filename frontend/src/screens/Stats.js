import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import StatsBanner from '../components/glycemia/StatsBanner';
import SummaryCard from '../components/glycemia/SummaryCard';
import ChartSection from '../components/glycemia/ChartSection';
import StatsGrid from '../components/glycemia/StatsGrid';
import MeasuresList from '../components/glycemia/MeasuresList';
import InfoCard from '../components/glycemia/InfoCard';
import glycemiaService from '../services/glycemiaService';
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
        <StatsBanner displayName={displayName} />

        {/* Section header - Stats */}
        <View style={styles.sectionHeader}>
          <BarChart3 size={20} color="#8E8E93" strokeWidth={2.5} />
          <Text style={styles.sectionHeaderText}>Stats</Text>
        </View>

        <View style={styles.container}>
          <SummaryCard stats={stats} />
          <ChartSection currentValue={currentValue} />
          <StatsGrid stats={stats} />
          <MeasuresList measures={recentMeasures} />
          <InfoCard stats={stats} />
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
  bottomPadding: {
    height: 100,
  },
});
