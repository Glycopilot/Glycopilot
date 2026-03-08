import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Search, X, ChevronRight, Plus, Minus } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import medicationService from '../../services/medicationService';
import { toastSuccess, toastError } from '../../services/toastService';
import type {
  MealTiming,
  ReferenceMedication,
  UserMedication,
  CreateUserMedicationPayload,
} from '../../types/medications.types';
import { MEAL_TIMING_OPTIONS } from './medications.constants';

interface MedFormModalProps {
  visible: boolean;
  editingMed: UserMedication | null;
  onClose: () => void;
  onAdd: (payload: CreateUserMedicationPayload) => Promise<UserMedication | null>;
  onUpdate: (id: number, payload: Partial<CreateUserMedicationPayload>) => Promise<boolean>;
}

export default function MedFormModal({
  visible,
  editingMed,
  onClose,
  onAdd,
  onUpdate,
}: MedFormModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReferenceMedication[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedMedRef, setSelectedMedRef] = useState<ReferenceMedication | null>(null);

  const [customName, setCustomName] = useState('');
  const [customDosage, setCustomDosage] = useState('');
  const [isPrescribed, setIsPrescribed] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState('');
  const [dosesPerDay, setDosesPerDay] = useState(1);
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(['08:00']);
  const [mealTiming, setMealTiming] = useState<MealTiming>('anytime');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingMed) {
      setCustomName(editingMed.display_name ?? '');
      setCustomDosage(editingMed.display_dosage ?? '');
      setIsPrescribed(editingMed.source === 'prescribed');
      setStartDate(editingMed.start_date);
      if (editingMed.end_date) {
        const diff = Math.round(
          (new Date(editingMed.end_date).getTime() - new Date(editingMed.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        setDurationDays(String(diff));
      } else {
        setDurationDays('');
      }
      setDosesPerDay(editingMed.doses_per_day);
      setScheduleTimes(
        editingMed.schedules.length > 0 ? editingMed.schedules.map(s => s.time) : ['08:00'],
      );
      setMealTiming(editingMed.meal_timing);
      setReminderEnabled(editingMed.schedules.some(s => s.reminder_enabled));
    } else {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMed]);

  const resetForm = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchDone(false);
    setSelectedMedRef(null);
    setCustomName('');
    setCustomDosage('');
    setIsPrescribed(false);
    setStartDate(new Date().toISOString().slice(0, 10));
    setDurationDays('');
    setDosesPerDay(1);
    setScheduleTimes(['08:00']);
    setMealTiming('anytime');
    setReminderEnabled(true);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setSelectedMedRef(null);
    setSearchDone(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      const results = await medicationService.search(q);
      setSearchResults(results.slice(0, 10));
      setSearchDone(true);
      setSearchLoading(false);
    }, 350);
  }, []);

  const selectSearchResult = useCallback((item: ReferenceMedication) => {
    setCustomName(item.name);
    setCustomDosage(item.dosage ?? '');
    setSelectedMedRef(item);
    setSearchQuery(item.name);
    setSearchResults([]);
    setSearchDone(false);
  }, []);

  const useTypedName = useCallback(() => {
    setCustomName(searchQuery.trim());
    setSearchResults([]);
    setSearchDone(false);
  }, [searchQuery]);

  const updateDosesPerDay = useCallback((n: number) => {
    const value = Math.max(1, Math.min(6, n));
    setDosesPerDay(value);
    setScheduleTimes(prev => {
      const next = [...prev];
      while (next.length < value) next.push('08:00');
      return next.slice(0, value);
    });
  }, []);

  const updateScheduleTime = useCallback((index: number, value: string) => {
    setScheduleTimes(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!customName.trim()) {
      toastError('Erreur', 'Le nom du médicament est requis.');
      return;
    }
    setSubmitting(true);
    const endDate = durationDays
      ? (() => {
          const d = new Date(startDate);
          d.setDate(d.getDate() + Number.parseInt(durationDays, 10));
          return d.toISOString().slice(0, 10);
        })()
      : undefined;

    const payload: CreateUserMedicationPayload = {
      ...(selectedMedRef ? { medication_id: selectedMedRef.medication_id } : {}),
      custom_name: customName.trim(),
      custom_dosage: customDosage.trim() || undefined,
      source: isPrescribed ? 'prescribed' : 'manual',
      start_date: startDate,
      end_date: endDate,
      doses_per_day: dosesPerDay,
      meal_timing: mealTiming,
      schedule_times: scheduleTimes,
      reminder_enabled: reminderEnabled,
    };

    if (editingMed) {
      const ok = await onUpdate(editingMed.id, payload);
      setSubmitting(false);
      if (ok) { toastSuccess('Traitement mis à jour'); handleClose(); }
      else toastError('Erreur', 'Impossible de mettre à jour.');
    } else {
      const result = await onAdd(payload);
      setSubmitting(false);
      if (result) { toastSuccess('Médicament ajouté'); handleClose(); }
      else toastError('Erreur', "Impossible d'ajouter le médicament.");
    }
  }, [
    customName, customDosage, isPrescribed, startDate, durationDays,
    dosesPerDay, mealTiming, scheduleTimes, reminderEnabled,
    selectedMedRef, editingMed, onAdd, onUpdate, handleClose,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose} />
      <View style={[styles.container, Platform.OS === 'ios' && { paddingBottom: 34 }]}>
        <View style={styles.handle} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            {editingMed ? 'Modifier le traitement' : 'Nouveau médicament'}
          </Text>

          {/* Recherche */}
          <View style={styles.section}>
            <Text style={styles.label}>Rechercher un médicament</Text>
            <View style={styles.searchRow}>
              <Search size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Doliprane, Metformine..."
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => { setSearchQuery(''); setSearchResults([]); }}
                  style={{ marginRight: 12 }}
                >
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            {searchLoading && <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 8 }} />}
            {searchResults.length > 0 && (
              <View style={styles.resultsList}>
                {searchResults.map(item => (
                  <TouchableOpacity
                    key={`ref-${item.medication_id}`}
                    style={styles.resultItem}
                    onPress={() => selectSearchResult(item)}
                  >
                    <Text style={styles.resultName}>{item.name}</Text>
                    {item.dosage && <Text style={styles.resultDosage}>{item.dosage}</Text>}
                    <ChevronRight size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {searchDone && searchResults.length === 0 && searchQuery.length >= 2 && (
              <TouchableOpacity style={styles.useTypedBtn} onPress={useTypedName}>
                <Text style={styles.useTypedText}>Utiliser « {searchQuery} »</Text>
                <ChevronRight size={14} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Nom */}
          <View style={styles.section}>
            <Text style={styles.label}>Nom du médicament</Text>
            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder="Doliprane 1000mg..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Dosage */}
          <View style={styles.section}>
            <Text style={styles.label}>Dosage</Text>
            <TextInput
              style={styles.input}
              value={customDosage}
              onChangeText={setCustomDosage}
              placeholder="ex: 1000mg, 12 unités..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Prescrit */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <Text style={styles.label}>Prescrit par un médecin</Text>
              <Switch
                value={isPrescribed}
                onValueChange={setIsPrescribed}
                trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Dates */}
          <View style={styles.formRow}>
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>Date de début</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>Durée (jours)</Text>
              <TextInput
                style={styles.input}
                value={durationDays}
                onChangeText={setDurationDays}
                placeholder="ex: 8"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Doses/jour */}
          <View style={styles.section}>
            <Text style={styles.label}>Nombre de prises par jour</Text>
            <View style={styles.doseRow}>
              <TouchableOpacity style={styles.doseMinusBtn} onPress={() => updateDosesPerDay(dosesPerDay - 1)}>
                <Minus size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.doseValue}>{dosesPerDay}</Text>
              <TouchableOpacity style={styles.dosePlusBtn} onPress={() => updateDosesPerDay(dosesPerDay + 1)}>
                <Plus size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Heures */}
          <View style={styles.section}>
            <Text style={styles.label}>Heures de prise</Text>
            {scheduleTimes.map((t, i) => (
              <TextInput
                key={`schedule-time-${i}`}
                style={[styles.input, { marginBottom: i < scheduleTimes.length - 1 ? 8 : 0 }]}
                value={t}
                onChangeText={v => updateScheduleTime(i, v)}
                placeholder="HH:MM"
                placeholderTextColor="#9CA3AF"
              />
            ))}
          </View>

          {/* Moment repas */}
          <View style={styles.section}>
            <Text style={styles.label}>Moment de prise</Text>
            <View style={styles.momentGrid}>
              {MEAL_TIMING_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.momentBtn, mealTiming === opt.value && styles.momentBtnActive]}
                  onPress={() => setMealTiming(opt.value)}
                >
                  <Text style={[styles.momentLabel, mealTiming === opt.value && styles.momentLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rappels */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <Text style={styles.label}>Activer les rappels</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Boutons */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>{editingMed ? 'Modifier' : 'Ajouter'}</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 34,
    maxHeight: '92%',
  },
  handle: {
    width: 48, height: 4, backgroundColor: '#D1D5DB',
    borderRadius: 2, alignSelf: 'center', marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 24 },
  section: { marginBottom: 16 },
  formRow: { flexDirection: 'row', marginBottom: 0 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.textPrimary },
  resultsList: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 6, overflow: 'hidden' },
  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 8,
  },
  resultName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  resultDosage: { fontSize: 13, color: colors.textSecondary },
  useTypedBtn: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#EBF5FF', borderRadius: 10, gap: 6,
  },
  useTypedText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#007AFF' },
  input: {
    borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: colors.textPrimary,
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  doseMinusBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  doseValue: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  dosePlusBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center',
  },
  momentGrid: { flexDirection: 'row', gap: 8 },
  momentBtn: {
    flex: 1, borderWidth: 2, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#fff',
  },
  momentBtnActive: { borderColor: '#007AFF', backgroundColor: '#EBF5FF' },
  momentLabel: { fontSize: 11, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  momentLabelActive: { color: '#007AFF' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderWidth: 2, borderColor: '#E5E7EB',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  submitBtn: {
    flex: 1, backgroundColor: '#007AFF', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
