import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors } from '../../themes/colors';

const { width } = Dimensions.get('window');

interface GlycemiaChartProps {
  chartData: {
    labels: string[];
    datasets: {
      data: number[];
    }[];
  };
}

export default function GlycemiaChart({
  chartData,
}: GlycemiaChartProps): React.JSX.Element {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Niveaux de glucose</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Bas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Normal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Haut</Text>
          </View>
        </View>
      </View>

      <LineChart
        data={chartData}
        width={width - 72}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '5',
            strokeWidth: '2',
            stroke: '#3B82F6',
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#F3F4F6',
            strokeWidth: 1,
          },
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        segments={3}
        yAxisSuffix=""
        fromZero={false}
      />

      {/* Zones colorées */}
      <View style={styles.chartZones}>
        <View style={styles.zoneIndicator}>
          <View
            style={[styles.zoneBar, { backgroundColor: '#FEE2E2', height: 60 }]}
          />
          <Text style={styles.zoneLabel}>{'< 70'}</Text>
        </View>
        <View style={styles.zoneIndicator}>
          <View
            style={[
              styles.zoneBar,
              { backgroundColor: '#D1FAE5', height: 100 },
            ]}
          />
          <Text style={styles.zoneLabel}>70-180</Text>
        </View>
        <View style={styles.zoneIndicator}>
          <View
            style={[styles.zoneBar, { backgroundColor: '#FEF3C7', height: 60 }]}
          />
          <Text style={styles.zoneLabel}>{'>180'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartZones: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  zoneIndicator: {
    alignItems: 'center',
    gap: 8,
  },
  zoneBar: {
    width: 60,
    borderRadius: 8,
  },
  zoneLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
