import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function IndicatorCard({ title, value, unit, subtitle, color = '#007AFF', style }) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginRight: 12,
    minWidth: 120,
  },
  title: {
    fontSize: 12,
    color: '#6b6b6b',
    fontWeight: '700',
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  unit: {
    fontSize: 12,
    color: '#6b6b6b',
    marginLeft: 6,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    color: '#6b6b6b',
    fontSize: 12,
  }
});