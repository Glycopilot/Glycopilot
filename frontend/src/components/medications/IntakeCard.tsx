import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, AlarmClock, XCircle, Pill } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import type { MedicationIntake } from '../../types/medications.types';
import {
  MEAL_TIMING_LABELS,
  getIntakeColor,
  getIntakeLabel,
} from './medications.constants';

interface IntakeCardProps {
  intake: MedicationIntake;
  onTake: () => void;
  onSnooze: () => void;
  onMiss: () => void;
}

export default function IntakeCard({ intake, onTake, onSnooze, onMiss }: IntakeCardProps) {
  const isPending = intake.status === 'pending';
  const statusColor = getIntakeColor(intake.status);

  return (
    <View style={[styles.card, !isPending && styles.cardDone]}>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={[styles.icon, { backgroundColor: `${statusColor}20` }]}>
            <Pill size={22} color={statusColor} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {intake.medication_name ?? '—'}
            </Text>
            <Text style={styles.moment}>
              {intake.medication_dosage ? `${intake.medication_dosage} • ` : ''}
              {intake.meal_timing ? MEAL_TIMING_LABELS[intake.meal_timing] : ''}
            </Text>
          </View>
        </View>

        {isPending ? (
          <TouchableOpacity style={styles.takeButton} onPress={onTake} activeOpacity={0.8}>
            <Text style={styles.takeButtonText}>Prendre</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {getIntakeLabel(intake.status)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.time}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={styles.timeText}>
            {intake.status === 'taken' && intake.taken_at
              ? `Pris à ${new Date(intake.taken_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              : intake.scheduled_time.slice(0, 5)}
          </Text>
        </View>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.snoozeBtn} onPress={onSnooze} activeOpacity={0.8}>
              <AlarmClock size={14} color="#F59E0B" />
              <Text style={styles.snoozeBtnText}>Reporter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.missBtn} onPress={onMiss} activeOpacity={0.8}>
              <XCircle size={14} color="#EF4444" />
              <Text style={styles.missBtnText}>Ignorer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDone: { opacity: 0.7 },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  icon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  moment: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  takeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  takeButtonText: { color: colors.secondary, fontWeight: '700', fontSize: 14 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  time: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 13, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: 8 },
  snoozeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, backgroundColor: '#FFF7ED',
  },
  snoozeBtnText: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },
  missBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, backgroundColor: '#FEF2F2',
  },
  missBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
});
