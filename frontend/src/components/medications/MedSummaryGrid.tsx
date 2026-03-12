import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, Pill } from 'lucide-react-native';

interface MedSummaryGridProps {
  takenToday: number;
  totalToday: number;
  activeCount: number;
}

export default function MedSummaryGrid({ takenToday, totalToday, activeCount }: MedSummaryGridProps) {
  return (
    <View style={styles.grid}>
      <View style={[styles.card, styles.blueCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.icon, styles.blueIcon]}>
            <CheckCircle size={16} color="#fff" />
          </View>
          <Text style={styles.cardLabel}>Pris aujourd'hui</Text>
        </View>
        <Text style={styles.cardValue}>{takenToday}</Text>
        <Text style={styles.cardSubtext}>sur {totalToday} prévues</Text>
      </View>

      <View style={[styles.card, styles.purpleCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.icon, styles.purpleIcon]}>
            <Pill size={16} color="#fff" />
          </View>
          <Text style={styles.cardLabel}>Traitements</Text>
        </View>
        <Text style={styles.cardValue}>{activeCount}</Text>
        <Text style={styles.cardSubtext}>actifs</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 15 },
  card: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1 },
  blueCard: { backgroundColor: '#EBF5FF', borderColor: '#BFDBFE' },
  purpleCard: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  icon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  blueIcon: { backgroundColor: '#007AFF' },
  purpleIcon: { backgroundColor: '#8B5CF6' },
  cardLabel: { fontSize: 12, fontWeight: '600' },
  cardValue: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  cardSubtext: { fontSize: 11, opacity: 0.7 },
});
