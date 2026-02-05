import React, { useState, useMemo } from 'react';
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
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Droplet,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';
import { useGlycemia } from '../hooks/useGlycemia';
import {
  GLYCEMIA_TARGET,
  getGlycemiaStatusColor,
} from '../constants/glycemia.constants';

// Types
type MeasurementContext =
  | 'À jeun'
  | 'Avant repas'
  | 'Après repas'
  | 'Coucher'
  | 'Autre';

type TrendType = 'stable' | 'up' | 'down';
type SourceFilter = 'all' | 'manual' | 'cgm';

// Mapping frontend → backend
const contextMapping: Record<
  MeasurementContext,
  'fasting' | 'preprandial' | 'postprandial_2h' | 'bedtime' | 'correction'
> = {
  'À jeun': 'fasting',
  'Avant repas': 'preprandial',
  'Après repas': 'postprandial_2h',
  Coucher: 'bedtime',
  Autre: 'correction',
};

interface GlycemiaMeasurement {
  id: string;
  value: number;
  context: MeasurementContext;
  time: string;
  date: string;
  trend: TrendType;
  source: 'manual' | 'cgm';
  note?: string;
}

interface ContextOption {
  label: MeasurementContext;
  icon: string;
  color: string;
}

interface GlycemiaScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    reset?: (config: {
      index: number;
      routes: Array<{ name: string }>;
    }) => void;
  };
}

interface MeasurementCardProps {
  item: GlycemiaMeasurement;
  onPress: () => void;
}

export default function GlycemiaScreen({
  navigation,
}: GlycemiaScreenProps): React.JSX.Element {
  const {
    measurements: backendData,
    loading,
    refreshing,
    refresh,
    addManualReading,
  } = useGlycemia(7);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [value, setValue] = useState<string>('');
  const [context, setContext] = useState<MeasurementContext>('À jeun');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Transformation + filtres + pagination
  const allMeasurements = useMemo(() => {
    return backendData.map((entry, index) => {
      const dateObj = new Date(entry.measured_at);
      const contextLabel =
        (Object.entries(contextMapping).find(
          ([, backendValue]) => backendValue === entry.context
        )?.[0] as MeasurementContext) || 'Autre';

      return {
        id:
          entry.reading_id ||
          `${entry.id}-${entry.measured_at}` ||
          `m-${index}`,
        value: entry.value,
        context: contextLabel,
        time: dateObj.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        date: dateObj.toLocaleDateString('fr-FR'),
        trend: 'stable' as TrendType,
        source: (entry.source || 'manual') as 'manual' | 'cgm',
        note: entry.notes,
      };
    });
  }, [backendData]);

  const filteredMeasurements = useMemo(() => {
    if (sourceFilter === 'all') return allMeasurements;
    return allMeasurements.filter(m => m.source === sourceFilter);
  }, [allMeasurements, sourceFilter]);

  const displayedMeasurements = filteredMeasurements.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMeasurements.length;
  const remaining = filteredMeasurements.length - visibleCount;

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + 10, filteredMeasurements.length));
  };

  // Statistiques du jour (sur les données FILTRÉES)
  const todayStr = new Date().toLocaleDateString('fr-FR');
  const todayMeasurements = useMemo(
    () => filteredMeasurements.filter(m => m.date === todayStr),
    [filteredMeasurements, todayStr]
  );

  const averageToday =
    todayMeasurements.length > 0
      ? Math.round(
          todayMeasurements.reduce((sum, m) => sum + m.value, 0) /
            todayMeasurements.length
        )
      : 0;

  const lastMeasurement = filteredMeasurements[0];

  const targetMin = GLYCEMIA_TARGET.MIN;
  const targetMax = GLYCEMIA_TARGET.MAX;

  const getGlycemiaStatus = (val: number) => {
    const { color, bgColor } = getGlycemiaStatusColor(val);
    if (val < targetMin) return { text: 'Hypo', color, bgColor };
    if (val > targetMax) return { text: 'Hyper', color, bgColor };
    return { text: 'Normal', color, bgColor };
  };

  const incrementValue = () => {
    const num = parseInt(value || '0', 10);
    setValue((num + 5).toString());
  };

  const decrementValue = () => {
    const num = parseInt(value || '0', 10);
    setValue(Math.max(0, num - 5).toString());
  };

  const addMeasurement = async () => {
    const numValue = parseInt(value.trim(), 10);
    if (!value.trim() || isNaN(numValue)) return;

    if (numValue < 20 || numValue > 600) {
      Alert.alert(
        'Valeur invalide',
        'La valeur doit être entre 20 et 600 mg/dL'
      );
      return;
    }

    setSubmitting(true);
    try {
      const backendContext = contextMapping[context];
      const success = await addManualReading({
        value: numValue,
        context: backendContext,
        notes: note.trim() || undefined,
      });

      if (success) {
        setModalVisible(false);
        setValue('');
        setContext('À jeun');
        setNote('');
      } else {
        Alert.alert('Erreur', "Impossible d'enregistrer la mesure.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        'Erreur',
        "Une erreur est survenue lors de l'enregistrement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const MeasurementCard = ({ item, onPress }: MeasurementCardProps) => {
    const status = getGlycemiaStatus(item.value);
    const TrendIcon =
      item.trend === 'up'
        ? TrendingUp
        : item.trend === 'down'
          ? TrendingDown
          : null;

    return (
      <TouchableOpacity
        style={styles.measurementCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.measurementContent}>
          <View style={styles.measurementLeft}>
            <View
              style={[
                styles.valueContainer,
                { backgroundColor: status.bgColor },
              ]}
            >
              <Text style={[styles.valueNumber, { color: status.color }]}>
                {item.value}
              </Text>
              <Text style={[styles.valueUnit, { color: status.color }]}>
                mg/dL
              </Text>
            </View>

            <View style={styles.measurementInfo}>
              <View style={styles.contextRow}>
                <Text style={styles.contextText}>{item.context}</Text>
                {TrendIcon && (
                  <TrendIcon
                    size={16}
                    color={item.trend === 'up' ? '#F59E0B' : '#10B981'}
                  />
                )}
              </View>

              <View style={styles.timeRow}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={styles.timeText}>{item.time}</Text>
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceText}>
                    {item.source === 'cgm' ? 'CGM' : 'Manuel'}
                  </Text>
                </View>
              </View>

              {item.note && (
                <Text style={styles.noteText} numberOfLines={1}>
                  💬 {item.note}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.measurementRight}>
            <View
              style={[styles.statusBadge, { backgroundColor: status.bgColor }]}
            >
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const contextOptions: ContextOption[] = [
    { label: 'À jeun', icon: '🌅', color: '#3B82F6' },
    { label: 'Avant repas', icon: '🍽️', color: '#F59E0B' },
    { label: 'Après repas', icon: '✅', color: '#10B981' },
    { label: 'Coucher', icon: '🌙', color: '#8B5CF6' },
    { label: 'Autre', icon: '📝', color: '#6B7280' },
  ];

  return (
    <Layout
      navigation={navigation}
      currentRoute="Home"
      userName="Utilisateur"
      onNotificationPress={() => console.log('Notifications')}
    >
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor="#007AFF"
              />
            }
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Glycémie</Text>
                <Text style={styles.subtitle}>
                  Suivi de votre taux de glucose
                </Text>
              </View>
              <TouchableOpacity style={styles.calendarButton}>
                <Calendar size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {/* Stats du jour */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Aujourd'hui ({todayStr})</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Droplet size={20} color="#007AFF" strokeWidth={2} />
                  <Text style={styles.statValue}>
                    {todayMeasurements.length}
                  </Text>
                  <Text style={styles.statLabel}>Mesures</Text>
                </View>
                <View style={styles.statBox}>
                  <TrendingUp size={20} color="#10B981" strokeWidth={2} />
                  <Text style={styles.statValue}>{averageToday || '—'}</Text>
                  <Text style={styles.statLabel}>Moyenne</Text>
                </View>
                <View style={styles.statBox}>
                  <Clock size={20} color="#F59E0B" strokeWidth={2} />
                  <Text style={styles.statValue}>
                    {lastMeasurement?.time || '—'}
                  </Text>
                  <Text style={styles.statLabel}>Dernière</Text>
                </View>
              </View>
            </View>

            {/* Historique */}
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Historique des mesures</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Plus size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Filtres */}
            <View style={styles.filterContainer}>
              {(['all', 'manual', 'cgm'] as SourceFilter[]).map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    sourceFilter === filter && styles.filterButtonActive,
                  ]}
                  onPress={() => {
                    setSourceFilter(filter);
                    setVisibleCount(10); // reset pagination quand filtre change
                  }}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      sourceFilter === filter && styles.filterButtonTextActive,
                    ]}
                  >
                    {filter === 'all'
                      ? 'Toutes'
                      : filter === 'manual'
                        ? 'Manuel'
                        : 'CGM'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.measurementsList}>
              {displayedMeasurements.length === 0 ? (
                <View style={styles.emptyState}>
                  <Droplet size={48} color="#CBD5E1" strokeWidth={1.5} />
                  <Text style={styles.emptyText}>
                    Aucune mesure enregistrée
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Appuyez sur + pour ajouter votre première mesure
                  </Text>
                </View>
              ) : (
                <>
                  {displayedMeasurements.map(item => (
                    <MeasurementCard
                      key={item.id}
                      item={item}
                      onPress={() => console.log('Open detail:', item.id)}
                    />
                  ))}

                  {hasMore && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={loadMore}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.loadMoreText}>
                        Voir {Math.min(10, remaining)} de plus ({remaining}{' '}
                        restantes)
                      </Text>
                      <View style={styles.loadMoreIcon}>
                        <Plus size={20} color="#007AFF" strokeWidth={2.5} />
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* Conseil */}
            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Droplet size={20} color="#3B82F6" />
                <Text style={styles.tipTitle}>Conseil</Text>
              </View>
              <Text style={styles.tipText}>
                Mesurez votre glycémie avant les repas et 2h après pour un
                meilleur suivi.
              </Text>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        )}

        {/* MODAL AJOUT MESURE */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          />

          <View
            style={[
              styles.modalContainer,
              Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.sheetHandle} />

              <Text style={styles.modalTitle}>Nouvelle mesure</Text>

              {/* Valeur */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Glycémie (mg/dL)</Text>
                <View style={styles.valueInputRow}>
                  <TouchableOpacity
                    style={styles.valueButtonMinus}
                    onPress={decrementValue}
                  >
                    <Minus size={24} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.valueInput}
                    value={value}
                    onChangeText={setValue}
                    placeholder="120"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={4}
                  />

                  <TouchableOpacity
                    style={styles.valueButtonPlus}
                    onPress={incrementValue}
                  >
                    <Plus size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {value && !isNaN(parseInt(value, 10)) && (
                  <View style={styles.valuePreview}>
                    <Text
                      style={[
                        styles.valuePreviewText,
                        { color: getGlycemiaStatus(parseInt(value, 10)).color },
                      ]}
                    >
                      {getGlycemiaStatus(parseInt(value, 10)).text}
                    </Text>
                  </View>
                )}
              </View>

              {/* Contexte */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Contexte de mesure</Text>
                <View style={styles.contextGrid}>
                  {contextOptions.map(option => (
                    <TouchableOpacity
                      key={option.label}
                      onPress={() => setContext(option.label)}
                      style={[
                        styles.contextButton,
                        context === option.label && {
                          borderColor: option.color,
                          backgroundColor: `${option.color}10`,
                        },
                      ]}
                    >
                      <Text style={styles.contextIcon}>{option.icon}</Text>
                      <Text
                        style={[
                          styles.contextLabel,
                          context === option.label && { color: option.color },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Note */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Note (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Ex: Avant sport, stress, malaise..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Info */}
              <View style={styles.infoCard}>
                <Droplet size={20} color="#3B82F6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Rappel</Text>
                  <Text style={styles.infoText}>
                    Objectif glycémique : {targetMin}–{targetMax} mg/dL
                  </Text>
                </View>
              </View>

              {/* Boutons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!value || submitting || isNaN(parseInt(value, 10))) &&
                      styles.submitButtonDisabled,
                  ]}
                  onPress={addMeasurement}
                  disabled={!value || submitting || isNaN(parseInt(value, 10))}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
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
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
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
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#EFF6FF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: '#007AFF',
  },
  measurementsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  measurementCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  measurementContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  measurementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  valueContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  valueNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  valueUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  measurementInfo: {
    flex: 1,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  contextText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  noteText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  measurementRight: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tipCard: {
    marginHorizontal: 20,
    marginTop: 24,
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
  // ──────────────── MODAL STYLES ────────────────
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
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  valueInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  valueButtonMinus: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
  },
  valueButtonPlus: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valuePreview: {
    marginTop: 12,
    alignItems: 'center',
  },
  valuePreviewText: {
    fontSize: 16,
    fontWeight: '700',
  },
  contextGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  contextButton: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  contextIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  contextLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    marginBottom: 24,
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
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
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
    paddingVertical: 14,
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
  // Load more
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  loadMoreIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
});
