import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, AlertCircle } from 'lucide-react-native';
import type { MedicationIntake } from '../../types/medications.types';

interface NextReminderCardProps {
  readonly nextIntake: MedicationIntake;
  readonly isOverdue?: boolean;
  readonly onViewAll: () => void;
}

export default function NextReminderCard({ nextIntake, isOverdue = false, onViewAll }: NextReminderCardProps) {
  const cardStyle = isOverdue ? styles.cardOverdue : styles.card;
  const titleColor = isOverdue ? '#991B1B' : '#92400E';
  const textColor = isOverdue ? '#B91C1C' : '#B45309';
  const borderColor = isOverdue ? '#FCA5A5' : '#FED7AA';
  const bgColor = isOverdue ? '#FEF2F2' : '#FFF7ED';

  return (
    <View style={[cardStyle, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.header}>
        {isOverdue
          ? <AlertCircle size={20} color="#EF4444" />
          : <Bell size={20} color="#F59E0B" />
        }
        <Text style={[styles.title, { color: titleColor }]}>
          {isOverdue ? 'En retard' : 'Prochain rappel'}
        </Text>
        {isOverdue && (
          <Text style={styles.overdueTime}>
            prévu à {nextIntake.scheduled_time.slice(0, 5)}
          </Text>
        )}
      </View>
      <Text style={[styles.text, { color: textColor }]}>
        {nextIntake.medication_name}
        {nextIntake.medication_dosage ? ` — ${nextIntake.medication_dosage}` : ''}
        {isOverdue ? '' : ` à ${nextIntake.scheduled_time.slice(0, 5)}`}
      </Text>
      <TouchableOpacity onPress={onViewAll}>
        <Text style={[styles.link, { color: textColor }]}>Voir toutes les doses →</Text>
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
  cardOverdue: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  overdueTime: { fontSize: 12, color: '#EF4444', fontWeight: '500' },
  text: { fontSize: 14, marginBottom: 8 },
  link: { fontSize: 14, fontWeight: '600' },
});
