import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ChevronDown } from 'lucide-react-native';
import { colors } from '../../themes/colors';

const screenWidth = Dimensions.get('window').width;

export default function GlycemieChart({ data, currentValue = 0 }) {
  const [selectedPeriod, setSelectedPeriod] = useState("Aujourd'hui");
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Données par défaut si aucune donnée n'est fournie
  const defaultData = {
    labels: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
    datasets: [
      {
        data: [100, 50, 110, 120, 105, 60, 145, 120],
        strokeWidth: 3,
      },
    ],
  };

  const chartData = data || defaultData;

  const periods = ["Aujourd'hui", 'Semaine', 'Mois'];

  const handlePeriodSelect = period => {
    setSelectedPeriod(period);
    setDropdownVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header avec titre et dropdown de période */}
      <View style={styles.header}>
        <Text style={styles.title}>Tendance glycémique</Text>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setDropdownVisible(!dropdownVisible)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>{selectedPeriod}</Text>
            <ChevronDown size={16} color="#FF9F1C" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Dropdown Menu */}
          {dropdownVisible && (
            <View style={styles.dropdownMenu}>
              {periods.map(period => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.dropdownItem,
                    selectedPeriod === period && styles.dropdownItemActive,
                  ]}
                  onPress={() => handlePeriodSelect(period)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedPeriod === period &&
                        styles.dropdownItemTextActive,
                    ]}
                  >
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Valeur actuelle */}
      <View style={styles.valueContainer}>
        <Text style={styles.valueLabel}>VALUE</Text>
        <Text style={styles.currentValue}>
          (
          {currentValue ||
            chartData.datasets[0].data[chartData.datasets[0].data.length - 1]}
          )
        </Text>
      </View>

      {/* Chart */}
      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#FFFFFF',
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(255, 159, 28, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '6',
            strokeWidth: '3',
            stroke: '#FFFFFF',
            fill: '#FF9F1C',
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#F0F0F0',
            strokeWidth: 1,
          },
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        fromZero={true}
        segments={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    // Ombre pour iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    // Ombre pour Android
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary || '#000000',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8B3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  dropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9F1C',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: '#FFF9F0',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary || '#8E8E93',
  },
  dropdownItemTextActive: {
    color: '#FF9F1C',
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary || '#000000',
    letterSpacing: 0.5,
  },
  currentValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF9F1C',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -16,
  },
});
