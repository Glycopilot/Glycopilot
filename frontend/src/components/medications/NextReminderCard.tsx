import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, AlertCircle, Clock } from 'lucide-react-native';
import type { MedicationIntake } from '../../types/medications.types';

interface NextReminderCardProps {
  readonly nextIntake: MedicationIntake;
  readonly isOverdue?: boolean;
  readonly isDueNow?: boolean;
  readonly onViewAll: () => void;
}

export default function NextReminderCard({
  nextIntake,
  isOverdue = false,
  isDueNow = false,
  onViewAll,
}: NextReminderCardProps) {
  type CardConfig = { bg: string; border: string; title: string; text: string; icon: React.ReactNode; label: string };

  const getConfig = (): CardConfig => {
    if (isDueNow) return { bg: '#F0FDF4', border: '#86EFAC', title: '#166534', text: '#15803D', icon: <Clock size={20} color="#22C55E" />, label: "C'est l'heure !" };
    if (isOverdue) return { bg: '#FEF2F2', border: '#FCA5A5', title: '#991B1B', text: '#B91C1C', icon: <AlertCircle size={20} color="#EF4444" />, label: 'En retard' };
    return { bg: '#FFF7ED', border: '#FED7AA', title: '#92400E', text: '#B45309', icon: <Bell size={20} color="#F59E0B" />, label: 'Prochain rappel' };
  };
  const config = getConfig();

  return (
    <View style={[styles.card, { backgroundColor: config.bg, borderColor: config.border }]}>
      <View style={styles.header}>
        {config.icon}
        <Text style={[styles.title, { color: config.title }]}>{config.label}</Text>
        {isOverdue && !isDueNow && (
          <Text style={styles.overdueTime}>
            prévu à {nextIntake.scheduled_time.slice(0, 5)}
          </Text>
        )}
        {isDueNow && (
          <Text style={[styles.overdueTime, { color: '#16A34A' }]}>
            {nextIntake.scheduled_time.slice(0, 5)}
          </Text>
        )}
      </View>
      <Text style={[styles.text, { color: config.text }]}>
        {nextIntake.medication_name}
        {nextIntake.medication_dosage ? ` — ${nextIntake.medication_dosage}` : ''}
        {!isOverdue && !isDueNow ? ` à ${nextIntake.scheduled_time.slice(0, 5)}` : ''}
      </Text>
      <TouchableOpacity onPress={onViewAll}>
        <Text style={[styles.link, { color: config.text }]}>Voir toutes les doses →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  overdueTime: { fontSize: 12, fontWeight: '500', color: '#EF4444' },
  text: { fontSize: 14, marginBottom: 8 },
  link: { fontSize: 14, fontWeight: '600' },
});
