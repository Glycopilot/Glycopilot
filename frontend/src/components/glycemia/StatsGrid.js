import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
} from 'lucide-react-native';

export default function StatsGrid({ stats }) {
  if (!stats) return null;

  return (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <View style={[styles.statIconBg, { backgroundColor: '#FFEBEE' }]}>
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
          <View style={[styles.statIconBg, { backgroundColor: '#FFEBEE' }]}>
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
          <View style={[styles.statIconBg, { backgroundColor: '#FFF9F0' }]}>
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
                backgroundColor: stats.stdDev <= 36 ? '#E8F5E9' : '#FFF3E0',
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
  );
}

const styles = StyleSheet.create({
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
});
