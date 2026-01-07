import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  BarChart3,
  Activity,
  Target,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { colors } from '../../themes/colors';

export default function SummaryCard({ stats }) {
  if (!stats) return null;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryTitleContainer}>
          <BarChart3 size={20} color="#FF9F1C" strokeWidth={2.5} />
          <Text style={styles.summaryTitle}>Récapitulatif 30 jours</Text>
        </View>
        <View style={styles.measuresBadge}>
          <Text style={styles.measuresCount}>{stats.count} mesures</Text>
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
              <TrendingDown size={20} color="#27AE60" strokeWidth={2.5} />
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
  );
}

const styles = StyleSheet.create({
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
});
