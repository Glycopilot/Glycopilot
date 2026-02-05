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
  Pill,
  Plus,
  Bell,
  Clock,
  CheckCircle,
  Minus,
  Syringe,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';

// Types
type MedicationType =
  | 'Insuline Rapide'
  | 'Insuline Lente'
  | 'Comprimé'
  | 'Autre';

interface Medication {
  id: string;
  type: MedicationType;
  name: string;
  dose: string;
  time: string;
  moment: string;
  color: string;
  icon: 'syringe' | 'pill';
  taken?: boolean;
}

type TabType = 'toTake' | 'history';
type FilterType = 'all' | 'Insuline Rapide' | 'Insuline Lente' | 'Comprimé';

interface MomentOption {
  label: string;
  icon: string;
}

interface MedicationsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    reset?: (config: {
      index: number;
      routes: Array<{ name: string }>;
    }) => void;
  };
}

interface MedicationItemProps {
  item: Medication;
  onPress: () => void;
  onMarkAsTaken: (id: string) => void;
}

export default function MedicationsScreen({
  navigation,
}: MedicationsScreenProps): React.JSX.Element {
  // États pour les médicaments
  const initialToTake: Medication[] = [
    {
      id: '1',
      type: 'Insuline Rapide',
      name: 'Novorapid',
      dose: '12 unités',
      time: '14:30',
      moment: 'Après repas',
      color: '#FF6B35',
      icon: 'syringe',
    },
    {
      id: '2',
      type: 'Comprimé',
      name: 'Metformine',
      dose: '850mg',
      time: '12:00',
      moment: 'Déjeuner',
      color: '#8B5CF6',
      icon: 'pill',
    },
    {
      id: '3',
      type: 'Insuline Lente',
      name: 'Lantus',
      dose: '24 unités',
      time: '22:00',
      moment: 'Soir',
      color: '#007AFF',
      icon: 'syringe',
    },
  ];

  const initialHistory: Medication[] = [
    {
      id: 'h1',
      type: 'Comprimé',
      name: 'Metformine',
      dose: '850mg',
      time: '08:00',
      moment: 'Matin',
      color: '#8B5CF6',
      icon: 'pill',
      taken: true,
    },
    {
      id: 'h2',
      type: 'Insuline Rapide',
      name: 'Novorapid',
      dose: '8 unités',
      time: '08:15',
      moment: 'Petit-déjeuner',
      color: '#FF6B35',
      icon: 'syringe',
      taken: true,
    },
  ];

  const [toTake, setToTake] = useState<Medication[]>(initialToTake);
  const [history, setHistory] = useState<Medication[]>(initialHistory);
  const [currentTab, setCurrentTab] = useState<TabType>('toTake');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // États du formulaire
  const [medicationType, setMedicationType] =
    useState<MedicationType>('Insuline Rapide');
  const [medicationName, setMedicationName] = useState<string>('');
  const [dose, setDose] = useState<string>('');
  const [time, setTime] = useState<string>('08:00');
  const [moment, setMoment] = useState<string>('');

  const moments: MomentOption[] = [
    { label: 'Avant repas', icon: '🍽️' },
    { label: 'Après repas', icon: '✅' },
    { label: 'Matin', icon: '🌅' },
    { label: 'Soir', icon: '🌙' },
  ];

  // Calculs des totaux
  const totalInsuline = [...toTake, ...history]
    .filter(
      m =>
        (m.type === 'Insuline Rapide' || m.type === 'Insuline Lente') &&
        !m.taken
    )
    .reduce((acc, m) => acc + parseInt(m.dose.replace(/\D/g, '') || '0'), 0);

  const totalComprimés = toTake.filter(m => m.type === 'Comprimé').length;

  const adherenceRate = Math.round(
    (history.length / (history.length + toTake.length)) * 100
  );

  // Filtrage
  const filteredMedications =
    currentTab === 'toTake'
      ? selectedFilter === 'all'
        ? toTake
        : toTake.filter(m => m.type === selectedFilter)
      : selectedFilter === 'all'
        ? history
        : history.filter(m => m.type === selectedFilter);

  const addMedication = (): void => {
    if (!medicationName.trim()) return;

    const color =
      medicationType === 'Insuline Rapide'
        ? '#FF6B35'
        : medicationType === 'Insuline Lente'
          ? '#007AFF'
          : '#8B5CF6';

    const icon =
      medicationType === 'Insuline Rapide' ||
      medicationType === 'Insuline Lente'
        ? 'syringe'
        : 'pill';

    const newMedication: Medication = {
      id: `${Date.now()}`,
      type: medicationType,
      name: medicationName,
      dose,
      time,
      moment,
      color,
      icon: icon as 'syringe' | 'pill',
    };

    setToTake(prev => [newMedication, ...prev]);
    setModalVisible(false);
    setMedicationName('');
    setDose('');
    setTime('08:00');
    setMoment('');
    setMedicationType('Insuline Rapide');
  };

  const markAsTaken = (itemId: string): void => {
    const item = toTake.find(t => t.id === itemId);
    if (!item) return;
    setToTake(prev => prev.filter(t => t.id !== itemId));
    setHistory(prev => [{ ...item, taken: true }, ...prev]);
  };

  const incrementDose = (): void => {
    const currentDose = parseInt(dose.replace(/\D/g, '') || '0');
    const increment = medicationType.includes('Insuline') ? 1 : 100;
    const unit = medicationType.includes('Insuline') ? ' unités' : 'mg';
    setDose(`${currentDose + increment}${unit}`);
  };

  const decrementDose = (): void => {
    const currentDose = parseInt(dose.replace(/\D/g, '') || '0');
    const decrement = medicationType.includes('Insuline') ? 1 : 100;
    const unit = medicationType.includes('Insuline') ? ' unités' : 'mg';
    setDose(`${Math.max(0, currentDose - decrement)}${unit}`);
  };

  const MedicationItem = ({
    item,
    onPress,
    onMarkAsTaken,
  }: MedicationItemProps): React.JSX.Element => {
    const Icon = item.icon === 'syringe' ? Syringe : Pill;

    return (
      <TouchableOpacity
        style={[
          styles.medicationCard,
          item.taken && styles.medicationCardTaken,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.medicationContent}>
          <View style={styles.medicationLeft}>
            <View
              style={[styles.medicationIcon, { backgroundColor: item.color }]}
            >
              <Icon size={24} color="#fff" />
            </View>
            <View style={styles.medicationInfo}>
              <Text
                style={[
                  styles.medicationName,
                  item.taken && styles.medicationNameTaken,
                ]}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.medicationMoment,
                  item.taken && styles.medicationMomentTaken,
                ]}
              >
                {item.moment} • {item.dose}
              </Text>
            </View>
          </View>
          <View style={styles.medicationRight}>
            {item.taken ? (
              <View style={styles.takenBadge}>
                <CheckCircle size={20} color="#10B981" />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.takeButton}
                onPress={() => onMarkAsTaken(item.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.takeButtonText}>Prendre</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.medicationFooter}>
          <View style={styles.medicationTime}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.medicationTimeText}>
              {item.taken ? `Pris à ${item.time}` : `À prendre à ${item.time}`}
            </Text>
          </View>
          <View
            style={[styles.typeBadge, { backgroundColor: `${item.color}20` }]}
          >
            <Text style={[styles.typeBadgeText, { color: item.color }]}>
              {item.type}
            </Text>
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
              <Text style={styles.title}>Médicaments</Text>
              <Text style={styles.subtitle}>Suivi de vos traitements</Text>
            </View>
            <TouchableOpacity style={styles.bellButton}>
              <Bell size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Résumé */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.insulinCard]}>
              <View style={styles.summaryCardHeader}>
                <View style={[styles.summaryIcon, styles.insulinIcon]}>
                  <Syringe size={16} color="#fff" />
                </View>
                <Text style={styles.summaryCardLabel}>Insuline</Text>
              </View>
              <Text style={styles.summaryCardValue}>{totalInsuline}U</Text>
              <Text style={styles.summaryCardSubtext}>aujourd'hui</Text>
            </View>

            <View style={[styles.summaryCard, styles.pillCard]}>
              <View style={styles.summaryCardHeader}>
                <View style={[styles.summaryIcon, styles.pillIcon]}>
                  <Pill size={16} color="#fff" />
                </View>
                <Text style={styles.summaryCardLabel}>Comprimés</Text>
              </View>
              <Text style={styles.summaryCardValue}>{totalComprimés}</Text>
              <Text style={styles.summaryCardSubtext}>à prendre</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tab,
                currentTab === 'toTake' ? styles.tabActive : null,
              ]}
              onPress={() => setCurrentTab('toTake')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  currentTab === 'toTake' ? styles.tabTextActive : null,
                ]}
              >
                À prendre ({toTake.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                currentTab === 'history' ? styles.tabActive : null,
              ]}
              onPress={() => setCurrentTab('history')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  currentTab === 'history' ? styles.tabTextActive : null,
                ]}
              >
                Historique ({history.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filtres */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
            contentContainerStyle={styles.filtersContent}
          >
            <TouchableOpacity
              onPress={() => setSelectedFilter('all')}
              style={[
                styles.filterButton,
                selectedFilter === 'all' && styles.filterButtonAll,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === 'all' && styles.filterButtonTextActive,
                ]}
              >
                Tous
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedFilter('Insuline Rapide')}
              style={[
                styles.filterButton,
                selectedFilter === 'Insuline Rapide' &&
                  styles.filterButtonRapide,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === 'Insuline Rapide' &&
                    styles.filterButtonTextActive,
                ]}
              >
                Insuline Rapide
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedFilter('Insuline Lente')}
              style={[
                styles.filterButton,
                selectedFilter === 'Insuline Lente' && styles.filterButtonLente,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === 'Insuline Lente' &&
                    styles.filterButtonTextActive,
                ]}
              >
                Insuline Lente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedFilter('Comprimé')}
              style={[
                styles.filterButton,
                selectedFilter === 'Comprimé' && styles.filterButtonPill,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === 'Comprimé' &&
                    styles.filterButtonTextActive,
                ]}
              >
                Comprimés
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Liste des médicaments */}
          <View style={styles.medicationsHeader}>
            <Text style={styles.sectionTitle}>
              {currentTab === 'toTake' ? 'Médicaments à prendre' : 'Historique'}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.medicationsList}>
            {currentTab === 'history' && (
              <View style={styles.adherenceCard}>
                <Text style={styles.adherenceLabel}>
                  ADHÉSION AU TRAITEMENT
                </Text>
                <Text style={styles.adherenceValue}>{adherenceRate}%</Text>
                <View style={styles.adherenceBadge}>
                  <CheckCircle size={24} color="#fff" strokeWidth={2} />
                </View>
              </View>
            )}

            {filteredMedications.map(medication => (
              <MedicationItem
                key={medication.id}
                item={medication}
                onPress={() => console.log('Open', medication.id)}
                onMarkAsTaken={markAsTaken}
              />
            ))}
          </View>

          {/* Rappels */}
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <Bell size={20} color="#F59E0B" />
              <Text style={styles.reminderTitle}>Prochain rappel</Text>
            </View>
            <Text style={styles.reminderText}>Lantus - 24 unités à 22:00</Text>
            <TouchableOpacity>
              <Text style={styles.reminderLink}>Configurer les rappels →</Text>
            </TouchableOpacity>
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
            <View style={styles.sheetHandle} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.modalTitle}>Nouveau médicament</Text>

              {/* Type de médicament */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Type de médicament</Text>
                <View style={styles.typeGrid}>
                  {[
                    { type: 'Insuline Rapide', icon: '⚡', color: '#FF6B35' },
                    { type: 'Insuline Lente', icon: '🕐', color: '#007AFF' },
                    { type: 'Comprimé', icon: '💊', color: '#8B5CF6' },
                    { type: 'Autre', icon: '📋', color: '#6B7280' },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.type}
                      onPress={() =>
                        setMedicationType(item.type as MedicationType)
                      }
                      style={[
                        styles.typeButton,
                        medicationType === item.type && {
                          borderColor: item.color,
                          backgroundColor: `${item.color}10`,
                        },
                      ]}
                    >
                      <Text style={styles.typeEmoji}>{item.icon}</Text>
                      <Text
                        style={[
                          styles.typeButtonText,
                          medicationType === item.type && { color: item.color },
                        ]}
                      >
                        {item.type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Nom du médicament */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Nom du médicament</Text>
                <TextInput
                  style={styles.input}
                  value={medicationName}
                  onChangeText={setMedicationName}
                  placeholder="Novorapid, Metformine..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Dosage */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Dosage</Text>
                <View style={styles.doseRow}>
                  <TouchableOpacity
                    style={styles.doseButtonMinus}
                    onPress={decrementDose}
                  >
                    <Minus size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.doseInput}
                    value={dose}
                    onChangeText={setDose}
                    placeholder={
                      medicationType.includes('Insuline')
                        ? '12 unités'
                        : '850mg'
                    }
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    style={styles.doseButtonPlus}
                    onPress={incrementDose}
                  >
                    <Plus size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Heure */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Heure de prise</Text>
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="08:00"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Moment */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Moment</Text>
                <View style={styles.momentGrid}>
                  {moments.map(m => (
                    <TouchableOpacity
                      key={m.label}
                      onPress={() => setMoment(m.label)}
                      style={[
                        styles.momentButton,
                        moment === m.label && styles.momentButtonActive,
                      ]}
                    >
                      <Text style={styles.momentIcon}>{m.icon}</Text>
                      <Text
                        style={[
                          styles.momentLabel,
                          moment === m.label && styles.momentLabelActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
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
                  style={styles.submitButton}
                  onPress={addMedication}
                >
                  <Text style={styles.submitButtonText}>Ajouter</Text>
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
  bellButton: {
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
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  insulinCard: {
    backgroundColor: '#EBF5FF',
    borderColor: '#BFDBFE',
  },
  pillCard: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insulinIcon: {
    backgroundColor: '#007AFF',
  },
  pillIcon: {
    backgroundColor: '#8B5CF6',
  },
  summaryCardLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCardValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryCardSubtext: {
    fontSize: 11,
    opacity: 0.7,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#007AFF',
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterButtonAll: {
    backgroundColor: '#007AFF',
  },
  filterButtonRapide: {
    backgroundColor: '#FF6B35',
  },
  filterButtonLente: {
    backgroundColor: '#007AFF',
  },
  filterButtonPill: {
    backgroundColor: '#8B5CF6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  medicationsHeader: {
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
  medicationsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  adherenceCard: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  adherenceLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    opacity: 0.95,
  },
  adherenceValue: {
    color: '#fff',
    marginTop: 8,
    fontSize: 36,
    fontWeight: '800',
  },
  adherenceBadge: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicationCard: {
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
  medicationCardTaken: {
    opacity: 0.6,
  },
  medicationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  medicationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  medicationNameTaken: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  medicationMoment: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  medicationMomentTaken: {
    textDecorationLine: 'line-through',
  },
  medicationRight: {
    marginLeft: 12,
  },
  takeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  takeButtonText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 14,
  },
  takenBadge: {
    width: 36,
    height: 36,
    backgroundColor: '#D1FAE5',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  medicationTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medicationTimeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reminderCard: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  reminderText: {
    fontSize: 14,
    color: '#B45309',
    marginBottom: 8,
  },
  reminderLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B45309',
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
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  typeButtonText: {
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
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doseButtonMinus: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.textPrimary,
  },
  doseButtonPlus: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  momentButton: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  momentButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#EBF5FF',
  },
  momentIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  momentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  momentLabelActive: {
    color: '#007AFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
