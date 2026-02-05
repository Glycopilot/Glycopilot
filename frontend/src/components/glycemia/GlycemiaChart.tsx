import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
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
  chartWidth?: number;
  measurementCount?: number;
}

export default function GlycemiaChart({
  chartData,
  chartWidth,
  measurementCount = 0,
}: GlycemiaChartProps): React.JSX.Element {
  const resolvedWidth = chartWidth || width - 72;
  const isScrollable = resolvedWidth > width - 72;

  // Vérifier si on a des données valides
  const hasValidData =
    chartData.datasets[0]?.data?.length > 0 &&
    chartData.datasets[0].data.some(v => v > 0);

  // Calculer l'espacement entre les labels
  const labelCount = chartData.labels?.length || 0;
  const labelWidth = resolvedWidth / Math.max(labelCount, 1);

  // Calculer les valeurs de l'axe Y dynamiquement
  const { yAxisValues, yMin, yMax } = React.useMemo(() => {
    if (!hasValidData) {
      return {
        yAxisValues: ['200', '150', '100', '50'],
        yMin: 50,
        yMax: 200,
      };
    }

    const allValues = chartData.datasets[0].data;
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);

    // Ajouter une marge de 10% pour que les points ne touchent pas les bords
    const margin = (maxValue - minValue) * 0.1;
    const adjustedMax = maxValue + margin;
    const adjustedMin = Math.max(0, minValue - margin);

    // Arrondir au multiple de 25 pour plus de précision
    const roundedMax = Math.ceil(adjustedMax / 25) * 25;
    let roundedMin = Math.floor(adjustedMin / 25) * 25;

    // Garantir un minimum de 25 pour éviter le 0
    if (roundedMin < 25) {
      roundedMin = 25;
    }

    // Garantir une plage minimale de 100
    const range = roundedMax - roundedMin;
    const finalMax = range < 100 ? roundedMin + 100 : roundedMax;

    const step = (finalMax - roundedMin) / 3;

    return {
      yAxisValues: [
        finalMax.toString(),
        Math.round(finalMax - step).toString(),
        Math.round(finalMax - step * 2).toString(),
        roundedMin.toString(),
      ],
      yMin: roundedMin,
      yMax: finalMax,
    };
  }, [chartData, hasValidData]);

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

      {!hasValidData ? (
        <View style={styles.emptyChartState}>
          <Text style={styles.emptyChartIcon}>📊</Text>
          <Text style={styles.emptyChartTitle}>Pas encore de données</Text>
          <Text style={styles.emptyChartText}>
            Ajoutez au moins une mesure pour voir votre courbe de glycémie
          </Text>
        </View>
      ) : (
        <>
          {/* Container avec axe Y fixe + graphique scrollable */}
          <View style={styles.chartContainer}>
            {/* Axe Y fixe */}
            <View style={styles.yAxisContainer}>
              {yAxisValues.map((value, index) => (
                <Text key={index} style={styles.yAxisLabel}>
                  {value}
                </Text>
              ))}
            </View>

            {/* Graphique scrollable */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              overScrollMode="never"
              contentContainerStyle={{ paddingRight: isScrollable ? 20 : 0 }}
              style={styles.chartScrollView}
            >
              <View>
                {/* Graphique */}
                <LineChart
                  data={{
                    labels: chartData.labels.map(() => ''), // Labels vides dans le graphique
                    datasets: chartData.datasets,
                  }}
                  width={resolvedWidth}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: (opacity = 1) =>
                      `rgba(107, 114, 128, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '6',
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
                  withVerticalLabels={false}
                  withHorizontalLabels={false}
                  segments={3}
                  yAxisSuffix=""
                  fromZero={false}
                />

                {/* Labels personnalisés sous le graphique */}
                <View
                  style={[
                    styles.customLabelsContainer,
                    { width: resolvedWidth },
                  ]}
                >
                  {chartData.labels.map((label, index) => (
                    <View
                      key={`label-${index}`}
                      style={[styles.customLabel, { width: labelWidth }]}
                    >
                      <Text style={styles.customLabelText} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Zones colorées */}
          <View style={styles.chartZones}>
            <View style={styles.zoneIndicator}>
              <View
                style={[
                  styles.zoneBar,
                  { backgroundColor: '#FEE2E2', height: 60 },
                ]}
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
                style={[
                  styles.zoneBar,
                  { backgroundColor: '#FEF3C7', height: 60 },
                ]}
              />
              <Text style={styles.zoneLabel}>{'>180'}</Text>
            </View>
          </View>

          {/* Info sur le nombre de mesures */}
          {measurementCount > 0 && (
            <View style={styles.chartFooter}>
              <Text style={styles.chartFooterText}>
                {measurementCount}{' '}
                {measurementCount === 1 ? 'mesure' : 'mesures'} affichée
                {measurementCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </>
      )}
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
  chartContainer: {
    flexDirection: 'row',
  },
  yAxisContainer: {
    width: 40,
    height: 220,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 10,
    marginRight: 4,
  },
  yAxisLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chartScrollView: {
    flex: 1,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  customLabelsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  customLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customLabelText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
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
  chartFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  chartFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // États vides
  emptyChartState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyChartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyChartText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
