import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pill, Edit2, Trash2 } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import type { UserMedication } from '../../types/medications.types';
import { MEAL_TIMING_LABELS } from './medications.constants';

interface ActiveMedListProps {
  medications: UserMedication[];
  onEdit: (med: UserMedication) => void;
  onDelete: (med: UserMedication) => void;
  onAdd: () => void;
}

export default function ActiveMedList({ medications, onEdit, onDelete, onAdd }: ActiveMedListProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes traitements</Text>
        <TouchableOpacity onPress={onAdd}>
          <Text style={styles.addLink}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {medications.length === 0 ? (
        <View style={styles.empty}>
          <Pill size={28} color="#C7C7CC" strokeWidth={1.5} />
          <Text style={styles.emptyText}>Aucun traitement ajouté</Text>
        </View>
      ) : (
        medications.map(med => (
          <View
            key={med.id}
            style={[styles.row, !med.statut && styles.rowInactive]}
          >
            <TouchableOpacity
              style={styles.rowMain}
              onPress={() => onEdit(med)}
              activeOpacity={0.75}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.dot, !med.statut && styles.dotInactive]} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.name, !med.statut && styles.nameInactive]}
                    numberOfLines={1}
                  >
                    {med.display_name}
                  </Text>
                  <Text style={styles.sub}>
                    {med.display_dosage ? `${med.display_dosage} · ` : ''}
                    {med.doses_per_day}x/jour · {MEAL_TIMING_LABELS[med.meal_timing]}
                    {med.statut ? '' : ' · Terminé'}
                  </Text>
                </View>
              </View>
              <Edit2 size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(med)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: { fontSize: 13, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  addLink: { fontSize: 13, fontWeight: '700', color: '#007AFF' },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  emptyText: { fontSize: 14, color: '#AEAEB2' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  rowInactive: { opacity: 0.55 },
  rowMain: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007AFF' },
  dotInactive: { backgroundColor: '#C7C7CC' },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  nameInactive: { color: '#9CA3AF' },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: { paddingLeft: 8 },
});
