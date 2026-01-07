import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react-native';
import GlycemieChart from '../dashboard/GlycemieChart';

export default function ChartSection({ currentValue }) {
  return (
    <View style={styles.chartContainer}>
      <GlycemieChart currentValue={currentValue} />
      <View style={styles.tooltipInfo}>
        <Zap size={16} color="#2196F3" strokeWidth={2.5} />
        <Text style={styles.tooltipText}>
          Maintenez votre glycémie entre 70-180 mg/dL pour un meilleur contrôle
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
