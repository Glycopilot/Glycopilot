import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import type { MedicationIntake } from '../../types/medications.types';

interface NextReminderCardProps {
  nextIntake: MedicationIntake;
  onViewAll: () => void;
}

export default function NextReminderCard({ nextIntake, onViewAll }: NextReminderCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Bell size={20} color="#F59E0B" />
        <Text style={styles.title}>Prochain rappel</Text>
      </View>
      <Text style={styles.text}>
        {nextIntake.medication_name}
        {nextIntake.medication_dosage ? ` — ${nextIntake.medication_dosage}` : ''}{' '}
        à {nextIntake.scheduled_time.slice(0, 5)}
      </Text>
      <TouchableOpacity onPress={onViewAll}>
        <Text style={styles.link}>Voir tous les rappels →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  text: { fontSize: 14, color: '#B45309', marginBottom: 8 },
  link: { fontSize: 14, fontWeight: '600', color: '#B45309' },
});
