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
  Utensils,
  Plus,
  Calendar,
  Edit2,
  Syringe,
  Camera,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';

// Types
interface Meal {
  id: number;
  type: string;
  time: string;
  glucides: number;
  calories: number;
  icon: string;
}

type MealType = 'Petit-déjeuner' | 'Déjeuner' | 'Collation' | 'Dîner';

interface MealTypeOption {
  label: MealType;
  icon: string;
}

interface NutritionScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    reset?: (config: {
      index: number;
      routes: Array<{ name: string }>;
    }) => void;
  };
}

export default function NutritionScreen({
  navigation,
}: NutritionScreenProps): React.JSX.Element {
  const [selectedMeal, setSelectedMeal] = useState<number | null>(null);
  const [showAddMeal, setShowAddMeal] = useState<boolean>(false);
  const [mealType, setMealType] = useState<MealType>('Petit-déjeuner');
  const [glucides, setGlucides] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const meals: Meal[] = [
    {
      id: 1,
      type: 'Petit-déjeuner',
      time: '08:00',
      glucides: 45,
      calories: 320,
      icon: '🌅',
    },
    {
      id: 2,
      type: 'Déjeuner',
      time: '12:30',
      glucides: 68,
      calories: 580,
      icon: '☀️',
    },
    {
      id: 3,
      type: 'Collation',
      time: '16:00',
      glucides: 15,
      calories: 120,
      icon: '🍎',
    },
    {
      id: 4,
      type: 'Dîner',
      time: '19:30',
      glucides: 52,
      calories: 480,
      icon: '🌙',
    },
  ];

  const mealTypes: MealTypeOption[] = [
    { label: 'Petit-déjeuner', icon: '🌅' },
    { label: 'Déjeuner', icon: '☀️' },
    { label: 'Collation', icon: '🍎' },
    { label: 'Dîner', icon: '🌙' },
  ];

  const glucidesTotal = meals.reduce((acc, m) => acc + m.glucides, 0);
  const caloriesTotal = meals.reduce((acc, m) => acc + m.calories, 0);
  const objectifGlucides = 200;

  const handleSubmit = (): void => {
    setShowAddMeal(false);
    setGlucides('');
    setCalories('');
    setDescription('');
    setMealType('Petit-déjeuner');
  };

  const progressPercentage = Math.min(
    (glucidesTotal / objectifGlucides) * 100,
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
              <Text style={styles.title}>Nutrition</Text>
              <Text style={styles.subtitle}>Jeudi, 12 Décembre 2024</Text>
            </View>
            <TouchableOpacity style={styles.calendarButton}>
              <Calendar size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Résumé journalier */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryLabel}>Glucides aujourd'hui</Text>
                <Text style={styles.summaryValue}>{glucidesTotal}g</Text>
              </View>
              <View style={styles.objectifBadge}>
                <Text style={styles.objectifText}>
                  Objectif: {objectifGlucides}g
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

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Utensils size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.statLabel}>Repas</Text>
                <Text style={styles.statValue}>{meals.length}</Text>
              </View>
              <View style={styles.statBox}>
                <Utensils size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.statLabel}>Calories</Text>
                <Text style={styles.statValue}>{caloriesTotal}</Text>
              </View>
            </View>
          </View>

          {/* Repas d'aujourd'hui */}
          <View style={styles.mealsHeader}>
            <Text style={styles.sectionTitle}>Repas d'aujourd'hui</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddMeal(true)}
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.mealsList}>
            {meals.map(meal => (
              <TouchableOpacity
                key={meal.id}
                style={styles.mealCard}
                onPress={() =>
                  setSelectedMeal(meal.id === selectedMeal ? null : meal.id)
                }
              >
                <View style={styles.mealContent}>
                  <View style={styles.mealLeft}>
                    <View style={styles.mealIconContainer}>
                      <Text style={styles.mealIcon}>{meal.icon}</Text>
                    </View>
                    <View>
                      <Text style={styles.mealTitle}>{meal.type}</Text>
                      <Text style={styles.mealTime}>{meal.time}</Text>
                    </View>
                  </View>
                  <View style={styles.mealRight}>
                    <Text style={styles.mealGlucides}>{meal.glucides}g</Text>
                    <Text style={styles.mealGlucidesLabel}>glucides</Text>
                  </View>
                </View>

                {selectedMeal === meal.id && (
                  <View style={styles.mealDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Calories</Text>
                      <Text style={styles.detailValue}>
                        {meal.calories} kcal
                      </Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.editButton}>
                        <Edit2 size={16} color="#007AFF" />
                        <Text style={styles.editButtonText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.doseButton}>
                        <Syringe size={16} color="#fff" />
                        <Text style={styles.doseButtonText}>Calculer dose</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Aide rapide */}
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Camera size={20} color="#9333EA" />
              <Text style={styles.tipTitle}>Astuce</Text>
            </View>
            <Text style={styles.tipText}>
              Prenez une photo de votre repas pour estimer automatiquement les
              glucides !
            </Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Modal d'ajout de repas */}
        <Modal
          visible={showAddMeal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAddMeal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowAddMeal(false)}
          />
          <View
            style={[
              styles.modalContainer,
              Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
            ]}
          >
            <View style={styles.sheetHandle} />

            <Text style={styles.modalTitle}>Ajouter un repas</Text>

            {/* Type de repas */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Type de repas</Text>
              <View style={styles.mealTypeGrid}>
                {mealTypes.map(type => (
                  <TouchableOpacity
                    key={type.label}
                    onPress={() => setMealType(type.label)}
                    style={[
                      styles.mealTypeButton,
                      mealType === type.label && styles.mealTypeButtonActive,
                    ]}
                  >
                    <Text style={styles.mealTypeIcon}>{type.icon}</Text>
                    <Text
                      style={[
                        styles.mealTypeLabel,
                        mealType === type.label && styles.mealTypeLabelActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Glucides */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Glucides (g)</Text>
              <TextInput
                style={styles.input}
                value={glucides}
                onChangeText={setGlucides}
                placeholder="45"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            {/* Calories */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Calories (kcal)</Text>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={setCalories}
                placeholder="320"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            {/* Description */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Pain complet, œufs, avocat..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Suggestion scan photo */}
            <View style={styles.photoSuggestion}>
              <Camera size={20} color="#9333EA" />
              <View style={{ flex: 1 }}>
                <Text style={styles.photoSuggestionTitle}>
                  Prendre une photo
                </Text>
                <Text style={styles.photoSuggestionText}>
                  Estimation automatique des glucides
                </Text>
              </View>
            </View>

            {/* Boutons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddMeal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Ajouter</Text>
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
  summaryCard: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#007AFF',
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
    color: '#B3D9FF',
    fontSize: 14,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
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
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
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
  mealsHeader: {
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
  mealsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  mealCard: {
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
  mealContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mealIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIcon: {
    fontSize: 24,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mealTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mealRight: {
    alignItems: 'flex-end',
  },
  mealGlucides: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  mealGlucidesLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  mealDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    paddingVertical: 12,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  doseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
  },
  doseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tipCard: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
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
    color: '#6B21A8',
  },
  tipText: {
    fontSize: 14,
    color: '#7C3AED',
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
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeButton: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  mealTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#EBF5FF',
  },
  mealTypeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  mealTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mealTypeLabelActive: {
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  photoSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  photoSuggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B21A8',
  },
  photoSuggestionText: {
    fontSize: 12,
    color: '#7C3AED',
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
