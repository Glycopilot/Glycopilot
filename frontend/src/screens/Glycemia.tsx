import React, { useState } from 'react';
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
import GlycemieCard from '../components/dashboard/GlycemieCard';
import { colors } from '../themes/colors';

// Types
type MeasurementContext =
  | 'À jeun'
  | 'Avant repas'
  | 'Après repas'
  | 'Coucher'
  | 'Autre';
type TrendType = 'stable' | 'up' | 'down';

interface GlycemiaMeasurement {
  id: string;
  value: number;
  context: MeasurementContext;
  time: string;
  date: string;
  trend: TrendType;
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
  const [measurements, setMeasurements] = useState<GlycemiaMeasurement[]>([
    {
      id: '1',
      value: 95,
      context: 'À jeun',
      time: '08:00',
      date: '29/01/2026',
      trend: 'stable',
    },
    {
      id: '2',
      value: 145,
      context: 'Après repas',
      time: '13:30',
      date: '29/01/2026',
      trend: 'up',
    },
    {
      id: '3',
      value: 110,
      context: 'Avant repas',
      time: '19:00',
      date: '28/01/2026',
      trend: 'down',
    },
  ]);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [value, setValue] = useState<string>('');
  const [context, setContext] = useState<MeasurementContext>('À jeun');
  const [note, setNote] = useState<string>('');

  const contextOptions: ContextOption[] = [
    { label: 'À jeun', icon: '🌅', color: '#3B82F6' },
    { label: 'Avant repas', icon: '🍽️', color: '#F59E0B' },
    { label: 'Après repas', icon: '✅', color: '#10B981' },
    { label: 'Coucher', icon: '🌙', color: '#8B5CF6' },
    { label: 'Autre', icon: '📝', color: '#6B7280' },
  ];

  // Calculs
  const todayMeasurements = measurements.filter(m => m.date === '29/01/2026');
  const averageToday =
    todayMeasurements.length > 0
      ? Math.round(
          todayMeasurements.reduce((acc, m) => acc + m.value, 0) /
            todayMeasurements.length
        )
      : 0;

  const lastMeasurement = measurements[0];
  const targetMin = 70;
  const targetMax = 140;

  const getGlycemiaStatus = (
    value: number
  ): { text: string; color: string; bgColor: string } => {
    if (value < targetMin) {
      return { text: 'Hypo', color: '#DC2626', bgColor: '#FEE2E2' };
    } else if (value > targetMax) {
      return { text: 'Hyper', color: '#F59E0B', bgColor: '#FEF3C7' };
    } else {
      return { text: 'Normal', color: '#10B981', bgColor: '#D1FAE5' };
    }
  };

  const incrementValue = (): void => {
    const currentValue = parseInt(value || '0', 10);
    setValue((currentValue + 5).toString());
  };

  const decrementValue = (): void => {
    const currentValue = parseInt(value || '0', 10);
    setValue(Math.max(0, currentValue - 5).toString());
  };

  const addMeasurement = (): void => {
    if (!value.trim()) return;

    const numValue = parseInt(value, 10);
    const previousValue = measurements[0]?.value || numValue;

    let trend: TrendType = 'stable';
    if (numValue > previousValue + 10) trend = 'up';
    if (numValue < previousValue - 10) trend = 'down';

    const newMeasurement: GlycemiaMeasurement = {
      id: `${Date.now()}`,
      value: numValue,
      context,
      time: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      date: new Date().toLocaleDateString('fr-FR'),
      trend,
      note: note.trim() || undefined,
    };

    setMeasurements(prev => [newMeasurement, ...prev]);
    setModalVisible(false);
    setValue('');
    setContext('À jeun');
    setNote('');
  };

  const MeasurementCard = ({
    item,
    onPress,
  }: MeasurementCardProps): React.JSX.Element => {
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

  return (
    <Layout
      navigation={navigation}
      currentRoute="Home"
      userName="Utilisateur"
      onNotificationPress={() => console.log('Notifications')}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
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

          {/* Carte de glycémie */}
          <GlycemieCard
            value={lastMeasurement?.value || 0}
            status={
              lastMeasurement
                ? (getGlycemiaStatus(
                    lastMeasurement.value
                  ).text.toLowerCase() as any)
                : 'normal'
            }
            timestamp={lastMeasurement ? new Date().toISOString() : undefined}
            onPress={() => console.log('Voir détails')}
          />

          {/* Statistiques du jour */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Aujourd'hui</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Droplet size={20} color="#007AFF" strokeWidth={2} />
                <Text style={styles.statValue}>{todayMeasurements.length}</Text>
                <Text style={styles.statLabel}>Mesures</Text>
              </View>
              <View style={styles.statBox}>
                <TrendingUp size={20} color="#10B981" strokeWidth={2} />
                <Text style={styles.statValue}>{averageToday || '--'}</Text>
                <Text style={styles.statLabel}>Moyenne</Text>
              </View>
              <View style={styles.statBox}>
                <Clock size={20} color="#F59E0B" strokeWidth={2} />
                <Text style={styles.statValue}>
                  {lastMeasurement?.time || '--'}
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

          <View style={styles.measurementsList}>
            {measurements.map(measurement => (
              <MeasurementCard
                key={measurement.id}
                item={measurement}
                onPress={() => console.log('Open', measurement.id)}
              />
            ))}
          </View>

          {/* Conseils */}
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

        {/* Modal d'ajout */}
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
                  />
                  <TouchableOpacity
                    style={styles.valueButtonPlus}
                    onPress={incrementValue}
                  >
                    <Plus size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                {value && (
                  <View style={styles.valuePreview}>
                    <Text
                      style={[
                        styles.valuePreviewText,
                        { color: getGlycemiaStatus(parseInt(value)).color },
                      ]}
                    >
                      {getGlycemiaStatus(parseInt(value)).text}
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

              {/* Note optionnelle */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Note (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Ex: Avant sport, stress..."
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
                    Objectif glycémique : {targetMin}-{targetMax} mg/dL
                  </Text>
                </View>
              </View>

              {/* Boutons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !value && styles.submitButtonDisabled,
                  ]}
                  onPress={addMeasurement}
                  disabled={!value}
                >
                  <Text style={styles.submitButtonText}>Enregistrer</Text>
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
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  measurementsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  measurementCard: {
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
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 20,
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
    gap: 8,
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
});
