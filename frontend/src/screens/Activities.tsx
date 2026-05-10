import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  ActivityIndicator,
} from 'react-native';
import {
  Activity as ActivityIcon,
  Plus,
  Calendar,
  Droplet,
  TrendingUp,
  Minus,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';
import { readStepsForToday } from '../services/readStepsForToday';
import {
  fetchDailyStepsState,
  syncDailySteps,
} from '../services/stepsSyncService';
import {
  createUserActivity,
  fetchActivityTypes,
  fetchUserActivityHistory,
  type ActivityTypeDto,
  type UserActivityDto,
} from '../services/activitiesApiService';
import {
  activityVisual,
  formatSessionTime,
  formatWeekTrend,
  glycemicEstimateFromSession,
  sumPreviousCalendarWeek,
  sumThisCalendarWeek,
} from '../utils/activityDisplay';
import { toastError, toastSuccess } from '../services/toastService';

interface SessionRow {
  id: number;
  type: string;
  duration: number;
  calories: number;
  impact: number;
  time: string;
  icon: string;
  color: string;
}

interface IntensityOption {
  label: string;
  factor: number;
  color: string;
}

interface ActivityScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    reset?: (config: {
      index: number;
      routes: Array<{ name: string }>;
    }) => void;
  };
}

export default function ActivityScreen({
  navigation,
}: ActivityScreenProps): React.JSX.Element {
  const [showAddActivity, setShowAddActivity] = useState<boolean>(false);
  const [duration, setDuration] = useState<string>('');
  const [intensity, setIntensity] = useState<string>('Modérée');
  const [activityHistory, setActivityHistory] = useState<UserActivityDto[]>(
    []
  );
  const [referenceActivities, setReferenceActivities] = useState<
    ActivityTypeDto[]
  >([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(
    null
  );
  const [stepsToday, setStepsToday] = useState<number | null>(null);
  const [milestonePoints, setMilestonePoints] = useState<number | null>(null);
  const [stepBlock, setStepBlock] = useState(100);
  const [pointsPerBlock, setPointsPerBlock] = useState(5);

  const refreshActivitiesFromServer = useCallback(async () => {
    const [types, history] = await Promise.all([
      fetchActivityTypes(),
      fetchUserActivityHistory(),
    ]);
    setReferenceActivities(types);
    setActivityHistory(history);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const stepsTask = (async () => {
          try {
            const state = await fetchDailyStepsState();
            if (cancelled) {
              return;
            }
            setStepsToday(state.reported_steps_today);
            setMilestonePoints(state.total_milestone_points);
            setStepBlock(state.step_block);
            setPointsPerBlock(state.points_per_block);

            const deviceSteps = await readStepsForToday();
            if (deviceSteps === null || cancelled) {
              return;
            }
            const sync = await syncDailySteps(deviceSteps);
            if (cancelled) {
              return;
            }
            setStepsToday(sync.steps);
            setMilestonePoints(sync.total_milestone_points);
            if (sync.points_earned > 0) {
              toastSuccess(
                'Paliers de pas',
                `+${sync.points_earned} points (${sync.milestones_crossed} palier${sync.milestones_crossed > 1 ? 's' : ''})`
              );
            }
          } catch {
            /* hors ligne ou non connecté */
          }
        })();

        const activitiesTask = (async () => {
          try {
            if (!cancelled) {
              setActivitiesLoading(true);
            }
            const [types, history] = await Promise.all([
              fetchActivityTypes(),
              fetchUserActivityHistory(),
            ]);
            if (cancelled) {
              return;
            }
            setReferenceActivities(types);
            setActivityHistory(history);
          } catch {
            if (!cancelled) {
              toastError('Activités', 'Impossible de charger vos séances.');
            }
          } finally {
            if (!cancelled) {
              setActivitiesLoading(false);
            }
          }
        })();

        await Promise.all([stepsTask, activitiesTask]);
      })();
      return () => {
        cancelled = true;
      };
    }, [refreshActivitiesFromServer])
  );

  const sessionRows: SessionRow[] = useMemo(() => {
    return activityHistory.map(h => {
      const v = activityVisual(h.activity_details.name);
      return {
        id: h.id,
        type: h.activity_details.name,
        duration: h.duration_minutes,
        calories: h.total_calories_burned,
        impact: -glycemicEstimateFromSession(
          h.total_calories_burned,
          h.total_sugar_used
        ),
        time: formatSessionTime(h.start),
        icon: v.emoji,
        color: v.color,
      };
    });
  }, [activityHistory]);

  const weekStats = useMemo(
    () => sumThisCalendarWeek(activityHistory),
    [activityHistory]
  );
  const prevWeekStats = useMemo(
    () => sumPreviousCalendarWeek(activityHistory),
    [activityHistory]
  );
  const trendLabel = useMemo(
    () => formatWeekTrend(weekStats.minutes, prevWeekStats.minutes),
    [weekStats.minutes, prevWeekStats.minutes]
  );

  const intensities: IntensityOption[] = [
    { label: 'Légère', factor: 0.7, color: 'green' },
    { label: 'Modérée', factor: 1, color: 'blue' },
    { label: 'Intense', factor: 1.4, color: 'red' },
  ];

  const totalDuration = weekStats.minutes;
  const totalCalories = weekStats.calories;
  const objectifMinutes = 150;

  const selectedRefActivity = referenceActivities.find(
    a => a.activity_id === selectedActivityId
  );
  const selectedIntensity = intensities.find(i => i.label === intensity);
  const durationMinutes = parseInt(duration || '0', 10);
  const kcalPerHour = selectedRefActivity?.calories_burned ?? 0;
  const estimatedCalories =
    selectedRefActivity && durationMinutes > 0 && kcalPerHour > 0
      ? Math.round(
          (kcalPerHour / 60) *
            durationMinutes *
            (selectedIntensity?.factor ?? 1)
        )
      : 0;

  const estimatedImpact =
    estimatedCalories > 0 ? Math.round(estimatedCalories / 25) : 0;

  const handleSubmit = (): void => {
    if (
      selectedActivityId == null ||
      !duration ||
      durationMinutes <= 0 ||
      submittingActivity
    ) {
      return;
    }
    void (async () => {
      try {
        setSubmittingActivity(true);
        await createUserActivity({
          activity: selectedActivityId,
          start: new Date().toISOString(),
          duration_minutes: durationMinutes,
          intensity,
        });
        await refreshActivitiesFromServer();
        toastSuccess('Séance enregistrée');
        setShowAddActivity(false);
        setSelectedActivityId(null);
        setDuration('');
        setIntensity('Modérée');
      } catch {
        toastError('Activités', 'Enregistrement impossible. Réessayez.');
      } finally {
        setSubmittingActivity(false);
      }
    })();
  };

  const incrementDuration = (): void => {
    setDuration((parseInt(duration || '0', 10) + 5).toString());
  };

  const decrementDuration = (): void => {
    setDuration(Math.max(0, parseInt(duration || '0', 10) - 5).toString());
  };

  const progressPercentage = Math.min(
    (totalDuration / objectifMinutes) * 100,
    100
  );

  return (
    <Layout
      navigation={navigation}
      currentRoute="Home"
      userName="Utilisateur"
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Activité</Text>
              <Text style={styles.subtitle}>Suivi de vos efforts</Text>
            </View>
            <View style={styles.calendarButton} accessibilityElementsHidden>
              <Calendar size={20} color="#007AFF" />
            </View>
          </View>

          <View style={styles.stepsMilestoneCard}>
            <Text style={styles.stepsMilestoneTitle}>Pas et paliers</Text>
            <View style={styles.stepsMilestoneRow}>
              <View>
                <Text style={styles.stepsMilestoneLabel}>Aujourd&apos;hui</Text>
                <Text style={styles.stepsMilestoneValue}>
                  {stepsToday !== null ? stepsToday : '—'}
                </Text>
              </View>
              <View style={styles.stepsMilestoneColRight}>
                <Text style={styles.stepsMilestoneLabel}>Points bonus</Text>
                <Text style={styles.stepsMilestoneValueAccent}>
                  {milestonePoints !== null ? milestonePoints : '—'}
                </Text>
              </View>
            </View>
            <Text style={styles.stepsMilestoneHint}>
              Compteur synchronisé avec votre compte. Chaque tranche de{' '}
              {stepBlock} pas enregistrée sur le serveur crédite {pointsPerBlock}{' '}
              points. Les pas proviennent des données santé de l&apos;appareil
              lorsque vous autorisez l&apos;accès.
            </Text>
          </View>

          {/* Résumé hebdomadaire */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryLabel}>Cette semaine</Text>
                <View style={styles.summaryValueRow}>
                  <Text style={styles.summaryValue}>{totalDuration}</Text>
                  <Text style={styles.summaryUnit}>min</Text>
                </View>
              </View>
              <View style={styles.objectifBadge}>
                <Text style={styles.objectifText}>
                  Objectif: {objectifMinutes}min
                </Text>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <ActivityIcon size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.statLabel}>Séances</Text>
                <Text style={styles.statValue}>{weekStats.sessions}</Text>
              </View>
              <View style={styles.statBox}>
                <Droplet size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.statLabel}>Calories</Text>
                <Text style={styles.statValue}>{totalCalories}</Text>
              </View>
              <View style={styles.statBox}>
                <TrendingUp size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.statLabel}>Sem. préc.</Text>
                <Text style={styles.statValue}>
                  {trendLabel === '='
                    ? 'Stable'
                    : trendLabel === '↑'
                      ? '↑'
                      : trendLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Impact sur la glycémie */}
          <View style={styles.impactCard}>
            <Text style={styles.impactTitle}>Impact sur la glycémie</Text>
            {sessionRows.length === 0 ? (
              <Text style={styles.impactEmpty}>
                Les séances enregistrées apparaîtront ici avec une estimation
                d&apos;effet sur la glycémie (ordre de grandeur).
              </Text>
            ) : (
              <View style={styles.impactList}>
                {sessionRows.slice(0, 3).map(activity => (
                  <View key={activity.id} style={styles.impactItem}>
                    <View style={styles.impactLeft}>
                      <Text style={styles.activityEmoji}>{activity.icon}</Text>
                      <View>
                        <Text style={styles.impactActivityName}>
                          {activity.type}
                        </Text>
                        <Text style={styles.impactActivityDuration}>
                          {activity.duration} min
                        </Text>
                      </View>
                    </View>
                    <View style={styles.impactRight}>
                      <View style={styles.impactValueContainer}>
                        <Text style={styles.impactValue}>
                          {activity.impact} mg/dL
                        </Text>
                        <Text style={styles.impactSubtext}>estimation</Text>
                      </View>
                      <TrendingUp
                        size={20}
                        color="#10B981"
                        style={{ transform: [{ rotate: '180deg' }] }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Activités récentes */}
          <View style={styles.activitiesHeader}>
            <Text style={styles.sectionTitle}>Activités récentes</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddActivity(true)}
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.activitiesList}>
            {activitiesLoading && sessionRows.length === 0 ? (
              <ActivityIndicator
                style={styles.activitiesLoader}
                color="#007AFF"
              />
            ) : sessionRows.length === 0 ? (
              <Text style={styles.emptyActivitiesText}>
                Aucune séance enregistrée. Appuyez sur + pour ajouter une
                activité : elle sera sauvegardée sur votre compte.
              </Text>
            ) : (
              sessionRows.map(activity => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityContent}>
                    <View style={styles.activityLeft}>
                      <View
                        style={[
                          styles.activityIcon,
                          { backgroundColor: activity.color },
                        ]}
                      >
                        <Text style={styles.activityEmoji}>{activity.icon}</Text>
                      </View>
                      <View>
                        <Text style={styles.activityName}>{activity.type}</Text>
                        <Text style={styles.activityTime}>{activity.time}</Text>
                      </View>
                    </View>
                    <View style={styles.activityRight}>
                      <View style={styles.activityDurationContainer}>
                        <Text style={styles.activityDuration}>
                          {activity.duration}
                        </Text>
                        <Text style={styles.activityDurationUnit}>min</Text>
                      </View>
                      <Text style={styles.activityCalories}>
                        {activity.calories} kcal
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Conseil */}
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <ActivityIcon size={20} color="#3B82F6" />
              <Text style={styles.tipTitle}>Conseil du jour</Text>
            </View>
            <Text style={styles.tipText}>
              L'activité physique régulière aide à stabiliser votre glycémie.
              Visez 30min par jour !
            </Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Modal d'ajout d'activité */}
        <Modal
          visible={showAddActivity}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAddActivity(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowAddActivity(false)}
          />
          <View
            style={[
              styles.modalContainer,
              Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
            ]}
          >
            <View style={styles.sheetHandle} />

            <Text style={styles.modalTitle}>Ajouter une activité</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              {/* Type d'activité */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Type d&apos;activité</Text>
                {referenceActivities.length === 0 ? (
                  <Text style={styles.modalEmptyTypes}>
                    Chargement des types d&apos;activité…
                  </Text>
                ) : (
                  <View style={styles.activityTypeGrid}>
                    {referenceActivities.map(type => {
                      const v = activityVisual(type.name);
                      const active = selectedActivityId === type.activity_id;
                      return (
                        <TouchableOpacity
                          key={type.activity_id}
                          onPress={() =>
                            setSelectedActivityId(type.activity_id)
                          }
                          style={[
                            styles.activityTypeButton,
                            active && styles.activityTypeButtonActive,
                          ]}
                        >
                          <Text style={styles.activityTypeIcon}>{v.emoji}</Text>
                          <Text
                            style={[
                              styles.activityTypeLabel,
                              active && styles.activityTypeLabelActive,
                            ]}
                            numberOfLines={2}
                          >
                            {type.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Durée */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Durée (minutes)</Text>
              <View style={styles.durationRow}>
                <TouchableOpacity
                  style={styles.durationButtonMinus}
                  onPress={decrementDuration}
                >
                  <Minus size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.durationInput}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="30"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.durationButtonPlus}
                  onPress={incrementDuration}
                >
                  <Plus size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Intensité */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Intensité</Text>
              <View style={styles.intensityRow}>
                {intensities.map(i => (
                  <TouchableOpacity
                    key={i.label}
                    onPress={() => setIntensity(i.label)}
                    style={[
                      styles.intensityButton,
                      intensity === i.label && styles.intensityButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.intensityButtonText,
                        intensity === i.label &&
                          styles.intensityButtonTextActive,
                      ]}
                    >
                      {i.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Estimations */}
            {estimatedCalories > 0 && (
              <View style={styles.estimationCard}>
                <Text style={styles.estimationTitle}>Estimations</Text>
                <View style={styles.estimationGrid}>
                  <View>
                    <Text style={styles.estimationLabel}>Calories brûlées</Text>
                    <Text style={styles.estimationValue}>
                      ~{estimatedCalories} kcal
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.estimationLabel}>Impact glycémie</Text>
                    <View style={styles.estimationImpactRow}>
                      <Text style={styles.estimationValue}>
                        -{estimatedImpact}
                      </Text>
                      <Text style={styles.estimationUnit}>mg/dL</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Info */}
            <View style={styles.infoCard}>
              <ActivityIcon size={20} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Conseil</Text>
                <Text style={styles.infoText}>
                  L'activité physique peut faire baisser votre glycémie pendant
                  et jusqu'à 24h après l'effort.
                </Text>
              </View>
            </View>

            </ScrollView>

            {/* Boutons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddActivity(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (selectedActivityId == null ||
                    !duration ||
                    durationMinutes <= 0 ||
                    submittingActivity) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  selectedActivityId == null ||
                  !duration ||
                  durationMinutes <= 0 ||
                  submittingActivity
                }
              >
                <Text style={styles.submitButtonText}>
                  {submittingActivity ? 'Enregistrement…' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  calendarButton: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stepsMilestoneCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  stepsMilestoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  stepsMilestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepsMilestoneColRight: {
    alignItems: 'flex-end',
  },
  stepsMilestoneLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  stepsMilestoneValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepsMilestoneValueAccent: {
    fontSize: 22,
    fontWeight: '700',
    color: '#15803D',
  },
  stepsMilestoneHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  summaryCard: {
    backgroundColor: '#10B981',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryLabel: {
    color: '#D1FAE5',
    fontSize: 14,
    marginBottom: 8,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
  },
  summaryUnit: {
    color: '#fff',
    fontSize: 24,
  },
  objectifBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  objectifText: {
    color: '#fff',
    fontSize: 12,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  impactCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  impactList: {
    gap: 12,
  },
  impactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityEmoji: {
    fontSize: 24,
  },
  impactActivityName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  impactActivityDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  impactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactValueContainer: {
    alignItems: 'flex-end',
  },
  impactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  impactSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  activitiesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  activityCard: {
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
  activityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activityTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityDurationContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  activityDuration: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityDurationUnit: {
    fontSize: 14,
  },
  activityCalories: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tipCard: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  tipText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  bottomPadding: {
    height: 100,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalScroll: {
    flexGrow: 0,
    maxHeight: 420,
    marginBottom: 8,
  },
  modalEmptyTypes: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingVertical: 8,
  },
  activitiesLoader: {
    marginVertical: 28,
  },
  emptyActivitiesText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 20,
    lineHeight: 20,
  },
  impactEmpty: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  activityTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityTypeButton: {
    width: '31%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  activityTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#EBF5FF',
  },
  activityTypeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  activityTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activityTypeLabelActive: {
    color: '#007AFF',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationButtonMinus: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
  },
  durationButtonPlus: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  intensityButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#EBF5FF',
  },
  intensityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  intensityButtonTextActive: {
    color: '#007AFF',
  },
  estimationCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  estimationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 12,
  },
  estimationGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  estimationLabel: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 4,
  },
  estimationValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065F46',
  },
  estimationImpactRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  estimationUnit: {
    fontSize: 14,
    color: '#065F46',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  infoText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
