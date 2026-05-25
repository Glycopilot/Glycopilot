import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Activity as ActivityIcon,
  Plus,
  Footprints,
  Flame,
  Timer,
  Minus,
  Trash2,
  Target,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';
import { usePedometer } from '../hooks/usePedometer';
import TutorialModal from '../components/tutorial/TutorialModal';
import { useScreenTutorial } from '../hooks/useScreenTutorial';
import { SCREEN_TUTORIALS } from '../constants/tutorial.constants';
import activityService, {
  type ReferenceActivity,
  type UserActivity,
} from '../services/activityService';

const INTENSITY_OPTIONS = [
  { label: 'Légère', factor: 0.7 },
  { label: 'Modérée', factor: 1 },
  { label: 'Intense', factor: 1.4 },
];

interface ActivityScreenProps {
  readonly navigation: {
    readonly navigate: (screen: string) => void;
    readonly reset?: (config: { index: number; routes: Array<{ name: string }> }) => void;
  };
}

export default function ActivityScreen({ navigation }: ActivityScreenProps): React.JSX.Element {
  // ── Podomètre ──────────────────────────────────────────────────────────────
  const {
    todaySteps,
    available: pedometerAvailable,
    stepGoal,
    setStepGoal,
    isTracking,
    sessionSteps,
    startTracking,
    stopTracking,
  } = usePedometer();
  const { showTutorial, completeTutorial } = useScreenTutorial('activities');

  // ── Objectif de pas ────────────────────────────────────────────────────────
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // ── Données ────────────────────────────────────────────────────────────────
  const [referenceActivities, setReferenceActivities] = useState<ReferenceActivity[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ReferenceActivity | null>(null);
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState('Modérée');
  const [submitting, setSubmitting] = useState(false);


  // ── Chargement données ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [refs, logs] = await Promise.all([
      activityService.getReferenceActivities(),
      activityService.getUserActivities(),
    ]);
    setReferenceActivities(refs);
    setUserActivities(logs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Soumission ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedActivity || !duration) return;
    setSubmitting(true);
    try {
      await activityService.logActivity({
        activity: selectedActivity.activity_id,
        start: new Date().toISOString(),
        duration_minutes: Number.parseInt(duration, 10),
        intensity,
        steps: isTracking ? sessionSteps : undefined,
      });
      setShowModal(false);
      setSelectedActivity(null);
      setDuration('30');
      setIntensity('Modérée');
      if (isTracking) stopTracking();
      await loadData();
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer l'activité.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Supprimer', 'Supprimer cette activité ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await activityService.deleteActivity(id);
          await loadData();
        },
      },
    ]);
  };

  // ── Stats semaine ──────────────────────────────────────────────────────────
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekActivities = userActivities.filter(a => new Date(a.start) >= weekStart);
  const totalMinutes = weekActivities.reduce((s, a) => s + a.duration_minutes, 0);
  const totalCalories = weekActivities.reduce((s, a) => s + a.total_calories_burned, 0);
  const progressPct = Math.min((totalMinutes / 150) * 100, 100);

  const formatSteps = (steps: number) => {
    if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`;
    return String(steps);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Aujourd'hui, ${time}`;
    if (isYesterday) return `Hier, ${time}`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + `, ${time}`;
  };

  return (
    <Layout navigation={navigation} currentRoute="Journal" userName="Utilisateur">
      <View style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Activité</Text>
              <Text style={styles.subtitle}>Suivi de vos efforts</Text>
            </View>
            <TouchableOpacity testID="add-activity-btn" style={styles.addButton} onPress={() => setShowModal(true)}>
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Podomètre */}
          <View style={styles.pedometerCard}>
            <View style={styles.pedometerHeader}>
              <View style={styles.pedometerIconWrap}>
                <Footprints size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pedometerLabel}>Pas aujourd'hui</Text>
                <Text style={styles.pedometerValue}>
                  {pedometerAvailable ? todaySteps.toLocaleString('fr-FR') : '—'}
                </Text>
              </View>
              {pedometerAvailable && (
                <TouchableOpacity
                  style={[styles.trackBtn, isTracking && styles.trackBtnActive]}
                  onPress={isTracking ? stopTracking : startTracking}
                >
                  <Text style={styles.trackBtnText}>
                    {isTracking ? 'Stop' : 'Démarrer'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {isTracking && (
              <View style={styles.sessionRow}>
                <Text style={styles.sessionLabel}>Session en cours :</Text>
                <Text style={styles.sessionValue}>{sessionSteps} pas</Text>
              </View>
            )}
            {pedometerAvailable && (
              <View style={styles.goalRow}>
                <View style={styles.goalProgressBg}>
                  <View style={[styles.goalProgressFill, { width: `${Math.min((todaySteps / stepGoal) * 100, 100)}%` }]} />
                </View>
                <TouchableOpacity
                  style={styles.goalEditBtn}
                  onPress={() => { setGoalInput(String(stepGoal)); setShowGoalModal(true); }}
                >
                  <Target size={14} color="#007AFF" />
                  <Text style={styles.goalEditText}>Objectif : {stepGoal.toLocaleString('fr-FR')} pas</Text>
                </TouchableOpacity>
              </View>
            )}
            {!pedometerAvailable && (
              <Text style={styles.pedometerUnavail}>
                Podomètre non disponible sur cet appareil
              </Text>
            )}
          </View>

          {/* Résumé semaine */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryLabel}>Cette semaine</Text>
                <View style={styles.summaryValueRow}>
                  <Text style={styles.summaryValue}>{totalMinutes}</Text>
                  <Text style={styles.summaryUnit}>min</Text>
                </View>
              </View>
              <View style={styles.objectifBadge}>
                <Text style={styles.objectifText}>Objectif : 150 min</Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <ActivityIcon size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.statLabel}>Séances</Text>
                <Text style={styles.statValue}>{weekActivities.length}</Text>
              </View>
              <View style={styles.statBox}>
                <Flame size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.statLabel}>Calories</Text>
                <Text style={styles.statValue}>{totalCalories}</Text>
              </View>
              <View style={styles.statBox}>
                <Footprints size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.statLabel}>Pas</Text>
                <Text style={styles.statValue}>
                  {pedometerAvailable ? formatSteps(todaySteps) : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Activités récentes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activités récentes</Text>
          </View>

          {loading && <Text style={styles.emptyText}>Chargement...</Text>}
          {!loading && userActivities.length === 0 && (
            <View style={styles.emptyCard}>
              <ActivityIcon size={32} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Aucune activité enregistrée</Text>
              <Text style={styles.emptySubtext}>Appuyez sur + pour ajouter une activité</Text>
            </View>
          )}
          {!loading && userActivities.length > 0 && (
            <View style={styles.activitiesList}>
              {userActivities.slice(0, 10).map(activity => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityContent}>
                    <View style={styles.activityLeft}>
                      <View style={styles.activityIconWrap}>
                        <ActivityIcon size={20} color="#10B981" />
                      </View>
                      <View>
                        <Text style={styles.activityName}>
                          {activity.activity_details.name}
                        </Text>
                        <Text style={styles.activityTime}>{formatTime(activity.start)}</Text>
                        {activity.steps != null && (
                          <Text style={styles.activitySteps}>{activity.steps} pas</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.activityRight}>
                      <View style={styles.activityDurationRow}>
                        <Timer size={14} color={colors.textSecondary} />
                        <Text style={styles.activityDuration}>{activity.duration_minutes} min</Text>
                      </View>
                      <Text style={styles.activityCalories}>{activity.total_calories_burned} kcal</Text>
                      <TouchableOpacity
                        onPress={() => handleDelete(activity.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Modal objectif de pas */}
        <Modal visible={showGoalModal} transparent animationType="slide" onRequestClose={() => setShowGoalModal(false)}>
          <KeyboardAvoidingView
            style={styles.goalModalWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Pressable style={{ flex: 1 }} onPress={() => setShowGoalModal(false)} />
            <View style={styles.goalModalBox}>
            <Text style={styles.goalModalTitle}>Objectif quotidien</Text>
            <Text style={styles.goalModalSubtitle}>Nombre de pas à atteindre chaque jour</Text>
            <TextInput
              style={styles.goalModalInput}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="numeric"
              placeholder="Ex : 8000"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.goalPresets}>
              {[5000, 7500, 10000, 12000].map(preset => (
                <TouchableOpacity
                  key={preset}
                  style={[styles.goalPresetBtn, Number(goalInput) === preset && styles.goalPresetBtnActive]}
                  onPress={() => setGoalInput(String(preset))}
                >
                  <Text style={[styles.goalPresetText, Number(goalInput) === preset && styles.goalPresetTextActive]}>
                    {(preset / 1000).toFixed(preset % 1000 === 0 ? 0 : 1)}k
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGoalModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={async () => {
                  const val = Number.parseInt(goalInput, 10);
                  if (val > 0) await setStepGoal(val);
                  setShowGoalModal(false);
                }}
              >
                <Text style={styles.submitBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </Modal>


        {/* Modal ajout */}
        <Modal
          visible={showModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)} />
          <View style={[styles.modalContainer, Platform.OS === 'ios' && { paddingBottom: 34 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Ajouter une activité</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sélection activité */}
              <Text style={styles.formLabel}>Type d'activité</Text>
              <View style={styles.activityTypeGrid}>
                {referenceActivities.map(ref => (
                  <TouchableOpacity
                    key={ref.activity_id}
                    style={[
                      styles.activityTypeButton,
                      selectedActivity?.activity_id === ref.activity_id && styles.activityTypeButtonActive,
                    ]}
                    onPress={() => setSelectedActivity(ref)}
                  >
                    <Text
                      style={[
                        styles.activityTypeLabel,
                        selectedActivity?.activity_id === ref.activity_id && styles.activityTypeLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {ref.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Durée */}
              <Text style={[styles.formLabel, { marginTop: 16 }]}>Durée (minutes)</Text>
              <View style={styles.durationRow}>
                <TouchableOpacity
                  style={styles.durationBtnMinus}
                  onPress={() => setDuration(d => String(Math.max(5, Number.parseInt(d || '5', 10) - 5)))}
                >
                  <Minus size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.durationInput}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={styles.durationBtnPlus}
                  onPress={() => setDuration(d => String(Number.parseInt(d || '0', 10) + 5))}
                >
                  <Plus size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Intensité */}
              <Text style={[styles.formLabel, { marginTop: 16 }]}>Intensité</Text>
              <View style={styles.intensityRow}>
                {INTENSITY_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.intensityBtn, intensity === opt.label && styles.intensityBtnActive]}
                    onPress={() => setIntensity(opt.label)}
                  >
                    <Text style={[styles.intensityBtnText, intensity === opt.label && styles.intensityBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Pas session */}
              {isTracking && (
                <View style={styles.sessionInfoCard}>
                  <Footprints size={18} color="#10B981" />
                  <Text style={styles.sessionInfoText}>
                    Session en cours · {sessionSteps} pas comptés
                  </Text>
                </View>
              )}

              {/* Estimation */}
              {selectedActivity && duration ? (
                <View style={styles.estimationCard}>
                  <Text style={styles.estimationTitle}>Estimation</Text>
                  <View style={styles.estimationGrid}>
                    <View>
                      <Text style={styles.estimationLabel}>Calories</Text>
                      <Text style={styles.estimationValue}>
                        ~{Math.round(
                          (Number.parseInt(duration, 10) / 60) *
                          (selectedActivity.calories_burned ?? 200) *
                          (INTENSITY_OPTIONS.find(o => o.label === intensity)?.factor ?? 1)
                        )} kcal
                      </Text>
                    </View>
                    {selectedActivity.recommended_duration && (
                      <View>
                        <Text style={styles.estimationLabel}>Durée conseillée</Text>
                        <Text style={styles.estimationValue}>
                          {selectedActivity.recommended_duration} min
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : null}

              {/* Boutons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, (!selectedActivity || !duration || submitting) && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!selectedActivity || !duration || submitting}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? 'Enregistrement...' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>

      <TutorialModal
        visible={showTutorial}
        steps={SCREEN_TUTORIALS.activities.steps}
        accentColor={SCREEN_TUTORIALS.activities.accentColor}
        onComplete={completeTutorial}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  addButton: {
    width: 48, height: 48, backgroundColor: '#007AFF', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  pedometerCard: {
    marginHorizontal: 20, marginBottom: 20, backgroundColor: '#fff',
    borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  pedometerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pedometerIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
  },
  pedometerLabel: { fontSize: 13, color: colors.textSecondary },
  pedometerValue: { fontSize: 26, fontWeight: '700', color: colors.textPrimary },
  pedometerUnavail: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  trackBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#EBF5FF', borderWidth: 1.5, borderColor: '#007AFF',
  },
  trackBtnActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  trackBtnText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  sessionLabel: { fontSize: 13, color: colors.textSecondary },
  sessionValue: { fontSize: 15, fontWeight: '700', color: '#10B981' },
  summaryCard: {
    backgroundColor: '#10B981', marginHorizontal: 20, borderRadius: 24,
    padding: 24, marginBottom: 20,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  summaryLabel: { color: '#D1FAE5', fontSize: 14, marginBottom: 8 },
  summaryValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  summaryValue: { color: '#fff', fontSize: 40, fontWeight: '700' },
  summaryUnit: { color: '#fff', fontSize: 24 },
  objectifBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  objectifText: { color: '#fff', fontSize: 12 },
  progressBarContainer: { width: '100%', height: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 16 },
  progressBar: { height: 12, backgroundColor: '#fff', borderRadius: 6 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
  statLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptyCard: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 8 },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  activitiesList: { paddingHorizontal: 20, gap: 12 },
  activityCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  activityContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  activityIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  activityName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  activityTime: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  activitySteps: { fontSize: 12, color: '#10B981', marginTop: 2 },
  activityRight: { alignItems: 'flex-end', gap: 4 },
  activityDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activityDuration: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  activityCalories: { fontSize: 12, color: colors.textSecondary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 34, maxHeight: '90%',
  },
  sheetHandle: { width: 48, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  activityTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityTypeButton: { borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff' },
  activityTypeButtonActive: { borderColor: '#007AFF', backgroundColor: '#EBF5FF' },
  activityTypeLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  activityTypeLabelActive: { color: '#007AFF' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  durationBtnMinus: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  durationInput: {
    flex: 1, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 22, fontWeight: '700',
    textAlign: 'center', color: colors.textPrimary,
  },
  durationBtnPlus: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },
  intensityRow: { flexDirection: 'row', gap: 8 },
  intensityBtn: { flex: 1, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  intensityBtnActive: { borderColor: '#007AFF', backgroundColor: '#EBF5FF' },
  intensityBtnText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  intensityBtnTextActive: { color: '#007AFF' },
  sessionInfoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
    backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  sessionInfoText: { fontSize: 14, color: '#065F46', fontWeight: '500' },
  estimationCard: {
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
    borderRadius: 12, padding: 16, marginTop: 16,
  },
  estimationTitle: { fontSize: 15, fontWeight: '600', color: '#065F46', marginBottom: 12 },
  estimationGrid: { flexDirection: 'row', gap: 24 },
  estimationLabel: { fontSize: 12, color: '#047857', marginBottom: 4 },
  estimationValue: { fontSize: 20, fontWeight: '700', color: '#065F46' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  submitBtn: { flex: 1, backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled: { backgroundColor: '#E5E7EB', shadowOpacity: 0 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  // Podomètre objectif
  goalRow: { marginTop: 12, gap: 8 },
  goalProgressBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  goalProgressFill: { height: 6, backgroundColor: '#10B981', borderRadius: 3 },
  goalEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  goalEditText: { fontSize: 12, color: '#007AFF', fontWeight: '500' },
  // Modal objectif
  goalModalWrapper: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  goalModalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  goalModalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  goalModalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  goalModalInput: {
    borderWidth: 2, borderColor: '#007AFF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 24,
    fontWeight: '700', textAlign: 'center', color: colors.textPrimary, marginBottom: 16,
  },
  goalPresets: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  goalPresetBtn: { flex: 1, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  goalPresetBtnActive: { borderColor: '#007AFF', backgroundColor: '#EBF5FF' },
  goalPresetText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  goalPresetTextActive: { color: '#007AFF' },
});
