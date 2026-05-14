import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Utensils,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CalendarX,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import BarcodeScannerModal from '../components/meals/BarcodeScannerModal';
import AddMealModal from '../components/meals/AddMealModal';
import { colors } from '../themes/colors';
import { useMeals } from '../hooks/useMeals';
import mealService from '../services/mealService';
import { toastSuccess, toastError } from '../services/toastService';
import type {
  MealType,
  MealReference,
  UserMeal,
  ComposedItem,
  CreateUserMealPayload,
  DayGlucidesData,
} from '../types/meals.types';

const DAY_LABELS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

const MEAL_ICON: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  snack: '🍎',
  dinner: '🌙',
};

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Collation',
  dinner: 'Dîner',
};

interface MealGroup {
  key: string;
  mealType: MealType;
  takenAt: string;
  items: UserMeal[];
  totalGlucides: number;
  totalCalories: number;
}

function groupMeals(meals: UserMeal[]): MealGroup[] {
  const map = new Map<string, MealGroup>();
  for (const meal of meals) {
    const groupKey = meal.session_key ?? `solo-${meal.id}`;
    if (!map.has(groupKey)) {
      map.set(groupKey, {
        key: groupKey,
        mealType: meal.meal_type,
        takenAt: meal.taken_at,
        items: [],
        totalGlucides: 0,
        totalCalories: 0,
      });
    }
    const g = map.get(groupKey)!;
    g.items.push(meal);
    g.totalGlucides += meal.glucides_consommes ?? 0;
    g.totalCalories += meal.calories_consommes ?? 0;
  }
  return Array.from(map.values());
}

function generateSessionKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso + 'T00:00:00'));
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso + 'T00:00:00'));
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getWeekStart(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
  return `${fmt.format(s)} – ${fmt.format(e)}`;
}

type ViewMode = 'day' | 'week';

// ─── Bar chart semaine ────────────────────────────────────────────────────────

interface WeekBarChartProps {
  weekData: DayGlucidesData[];
  selectedDate: string;
  objectif: number;
  onSelectDay: (date: string) => void;
}

function WeekBarChart({ weekData, selectedDate, objectif, onSelectDay }: WeekBarChartProps) {
  const maxVal = Math.max(...weekData.map(d => d.total_glucides), objectif, 1);

  return (
    <View style={styles.weekChartContainer}>
      {weekData.map((day, idx) => {
        const isSelected = day.date === selectedDate;
        const hasData = day.total_glucides > 0;
        const barH = hasData ? Math.max((day.total_glucides / maxVal) * 96, 6) : 3;

        return (
          <TouchableOpacity
            key={day.date}
            style={styles.barCol}
            onPress={() => onSelectDay(day.date)}
            activeOpacity={0.7}
          >
            <Text style={[styles.barValue, isSelected && styles.barValueActive]}>
              {hasData ? Math.round(day.total_glucides) : ''}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: barH },
                  isSelected ? styles.barActive : hasData ? styles.barInactive : styles.barEmpty,
                ]}
              />
            </View>
            <Text style={[styles.barDayLabel, isSelected && styles.barDayLabelActive]}>
              {DAY_LABELS[idx]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

interface NutritionScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    reset?: (config: { index: number; routes: Array<{ name: string }> }) => void;
  };
}

export default function NutritionScreen({ navigation }: NutritionScreenProps): React.JSX.Element {
  const {
    meals,
    summary,
    selectedDate,
    loading,
    refreshing,
    setDate,
    refresh,
    addMeals,
    deleteMeal,
  } = useMeals();

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [composedItems, setComposedItems] = useState<ComposedItem[]>([]);
  const [compositionMealType, setCompositionMealType] = useState<MealType>('lunch');
  const [prefillRef, setPrefillRef] = useState<MealReference | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [weekData, setWeekData] = useState<DayGlucidesData[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);

  const objectifGlucides = 200;
  const todayISO = new Date().toISOString().split('T')[0];
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = shiftDate(weekStart, 6);

  useEffect(() => {
    if (viewMode !== 'week') return;
    setWeekLoading(true);
    mealService.getRangeSummary(weekStart, weekEnd)
      .then(setWeekData)
      .finally(() => setWeekLoading(false));
  }, [viewMode, weekStart]);

  const totalGlucides = summary?.total_glucides ?? 0;
  const totalCalories = summary?.total_calories ?? 0;
  const progress = Math.min((totalGlucides / objectifGlucides) * 100, 100);
  const isToday = selectedDate === todayISO;
  const mealGroups = groupMeals(meals);

  const weekTotalGlucides = weekData.reduce((s, d) => s + d.total_glucides, 0);
  const weekTotalCalories = weekData.reduce((s, d) => s + d.total_calories, 0);
  const daysWithMeals = weekData.filter(d => d.meal_count > 0).length;
  const weekAvg = daysWithMeals > 0 ? weekTotalGlucides / daysWithMeals : 0;
  const weekProgress = Math.min((weekTotalGlucides / (objectifGlucides * 7)) * 100, 100);
  const isCurrentWeek = weekStart === getWeekStart(todayISO);
  const weekHasNoData = !weekLoading && weekData.length > 0 && weekData.every(d => d.meal_count === 0);

  const handlePrev = () => setDate(shiftDate(selectedDate, viewMode === 'week' ? -7 : -1));
  const handleNext = () => setDate(shiftDate(selectedDate, viewMode === 'week' ? 7 : 1));
  const isCurrentPeriod = viewMode === 'week' ? isCurrentWeek : isToday;

  const openAdd = () => {
    setComposedItems([]);
    setCompositionMealType('lunch');
    setPrefillRef(null);
    setShowAdd(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setComposedItems([]);
    setPrefillRef(null);
  };

  const handleProductFromBarcode = (product: MealReference) => {
    setPrefillRef(product);
    setShowAdd(true);
  };

  const resolveItemMealId = async (item: ComposedItem): Promise<number> => {
    let mealId = item.selectedRef?.meal_id ?? -1;

    if (mealId === -1 && item.selectedRef) {
      const created = await mealService.createMealFromProduct({
        name: item.selectedRef.name,
        barcode: item.selectedRef.barcode,
        calories: item.selectedRef.calories,
        glucides: item.selectedRef.glucides,
        proteines: item.selectedRef.proteines,
        lipides: item.selectedRef.lipides,
        image_url: item.selectedRef.link_photo,
      });
      if (created) return created.meal_id;
    }

    if (mealId === -1) {
      const glucidesVal = parseFloat(item.glucidesRaw) || null;
      const caloriesVal = parseInt(item.caloriesRaw, 10) || null;
      try {
        const refs = await mealService.searchReference(item.name);
        const existing = refs.find(m => m.name.toLowerCase() === item.name.toLowerCase());
        if (existing) return existing.meal_id;
        const created = await mealService.createMealFromProduct({
          name: item.name,
          barcode: null,
          calories: caloriesVal,
          glucides: glucidesVal,
          proteines: null,
          lipides: null,
          image_url: null,
        });
        if (created) return created.meal_id;
      } catch {
        // ignore
      }
    }

    return mealId;
  };

  const handleSubmit = async (pendingItem: ComposedItem | null) => {
    const allItems = pendingItem ? [...composedItems, pendingItem] : [...composedItems];
    if (allItems.length === 0) return;

    setSubmitting(true);
    const sessionKey = allItems.length > 1 ? generateSessionKey() : undefined;
    const taken_at = new Date().toISOString();

    try {
      const payloads: CreateUserMealPayload[] = [];

      for (const item of allItems) {
        const mealId = await resolveItemMealId(item);
        if (mealId === -1) continue;

        payloads.push({
          meal_id: mealId,
          taken_at,
          meal_type: compositionMealType,
          portion_g: item.portionG ? parseFloat(item.portionG) : undefined,
          input_mode: item.selectedRef?.barcode ? 'barcode' : item.selectedRef ? 'search' : 'manual',
          session_key: sessionKey,
        });
      }

      if (payloads.length === 0) {
        toastError('Repas invalide', 'Impossible de créer ces aliments.');
        setSubmitting(false);
        return;
      }

      const success = await addMeals(payloads);
      setSubmitting(false);
      if (success) {
        closeAdd();
        toastSuccess(
          'Repas enregistré',
          payloads.length > 1 ? `${payloads.length} aliments ajoutés` : 'Ajouté au journal'
        );
      } else {
        toastError('Erreur', "Impossible d'enregistrer le repas.");
      }
    } catch {
      setSubmitting(false);
      toastError('Erreur', "Une erreur est survenue.");
    }
  };

  const handleDeleteGroup = (group: MealGroup) => {
    if (group.items.length === 1) {
      Alert.alert('Supprimer', 'Supprimer ce repas du journal ?', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeal(group.items[0].id);
            } catch {
              toastError('Erreur', 'Impossible de supprimer ce repas.');
            }
          },
        },
      ]);
    } else {
      Alert.alert(
        'Supprimer le repas',
        `Supprimer les ${group.items.length} aliments de ce repas ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Tout supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                for (const item of group.items) await deleteMeal(item.id);
              } catch {
                toastError('Erreur', 'Impossible de supprimer ce repas.');
              }
            },
          },
        ]
      );
    }
  };

  return (
    <Layout navigation={navigation} currentRoute="Home" userName="Utilisateur">
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nutrition</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {viewMode === 'week'
                  ? formatWeekRange(weekStart, weekEnd)
                  : isToday
                    ? "Aujourd'hui"
                    : formatDate(selectedDate)}
              </Text>
            </View>
            <View style={styles.dateNav}>
              <TouchableOpacity style={styles.dateNavBtn} onPress={handlePrev}>
                <ChevronLeft size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              {!isCurrentPeriod && (
                <TouchableOpacity
                  style={[styles.dateNavBtn, { paddingHorizontal: 10 }]}
                  onPress={() => setDate(todayISO)}
                >
                  <Text style={{ fontSize: 12, color: '#007AFF', fontWeight: '600' }}>Auj.</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.dateNavBtn} onPress={handleNext}>
                <ChevronRight size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Toggle Jour / Semaine */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'day' && styles.toggleBtnActive]}
              onPress={() => setViewMode('day')}
            >
              <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>
                Jour
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive]}
              onPress={() => setViewMode('week')}
            >
              <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
                Semaine
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#007AFF" />
          ) : (
            <>
              {/* Carte récap — jour ou semaine */}
              {viewMode === 'day' ? (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <View>
                      <Text style={styles.summaryLabel}>Glucides du jour</Text>
                      <Text style={styles.summaryValue}>{totalGlucides}g</Text>
                    </View>
                    <View style={styles.objectifBadge}>
                      <Text style={styles.objectifText}>Objectif : {objectifGlucides}g</Text>
                    </View>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Utensils size={16} color="#fff" strokeWidth={2} />
                      <Text style={styles.statLabel}>Repas</Text>
                      <Text style={styles.statValue}>{summary?.meal_count ?? 0}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Utensils size={16} color="#fff" strokeWidth={2} />
                      <Text style={styles.statLabel}>Calories</Text>
                      <Text style={styles.statValue}>{totalCalories} kcal</Text>
                    </View>
                  </View>
                </View>
              ) : weekLoading ? (
                <View style={styles.weekLoadingBox}>
                  <ActivityIndicator color="#007AFF" size="large" />
                  <Text style={styles.weekLoadingText}>Chargement…</Text>
                </View>
              ) : weekHasNoData ? (
                <View style={styles.weekEmptyCard}>
                  <CalendarX size={36} color="#D1D5DB" strokeWidth={1.5} />
                  <Text style={styles.weekEmptyTitle}>Aucun repas enregistré</Text>
                  <Text style={styles.weekEmptySubtext}>
                    Vous n'avez pas encore saisi de repas pour cette semaine. Le suivi hebdomadaire vous permet de visualiser l'évolution de vos glucides jour par jour.
                  </Text>
                  <Text style={styles.weekEmptySubtext}>
                    Passez en mode <Text style={styles.weekEmptyHighlight}>Jour</Text> pour ajouter vos repas, ou utilisez les flèches pour consulter une autre semaine.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <View>
                        <Text style={styles.summaryLabel}>Glucides de la semaine</Text>
                        <Text style={styles.summaryValue}>{Math.round(weekTotalGlucides)}g</Text>
                      </View>
                      <View style={styles.objectifBadge}>
                        <Text style={styles.objectifText}>Objectif : {objectifGlucides * 7}g</Text>
                      </View>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${weekProgress}%` }]} />
                    </View>
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Moy./jour</Text>
                        <Text style={styles.statValue}>{Math.round(weekAvg)}g</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Calories</Text>
                        <Text style={styles.statValue}>{Math.round(weekTotalCalories)} kcal</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.barChartCard}>
                    <WeekBarChart
                      weekData={weekData}
                      selectedDate={selectedDate}
                      objectif={objectifGlucides}
                      onSelectDay={setDate}
                    />
                  </View>
                </>
              )}

              {/* Liste des repas */}
              <View style={styles.mealsHeader}>
                <Text style={styles.sectionTitle}>
                  {viewMode === 'week'
                    ? (isToday ? "Aujourd'hui" : formatDateShort(selectedDate))
                    : 'Repas du jour'}
                </Text>
                <TouchableOpacity style={styles.addButton} onPress={openAdd}>
                  <Plus size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {mealGroups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Aucun repas enregistré</Text>
                  <Text style={styles.emptySubtext}>
                    Appuyez sur + pour composer votre premier repas
                  </Text>
                </View>
              ) : (
                <View style={styles.mealsList}>
                  {mealGroups.map(group => {
                    const isExpanded = expandedKey === group.key;
                    const isComposed = group.items.length > 1;

                    return (
                      <View key={group.key} style={styles.mealCard}>
                        <TouchableOpacity
                          onPress={() => setExpandedKey(isExpanded ? null : group.key)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.mealContent}>
                            <View style={styles.mealLeft}>
                              <View style={styles.mealIconContainer}>
                                <Text style={styles.mealIcon}>{MEAL_ICON[group.mealType]}</Text>
                                {isComposed && (
                                  <View style={styles.composedBadge}>
                                    <Text style={styles.composedBadgeText}>{group.items.length}</Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.mealTitle} numberOfLines={1}>
                                  {isComposed
                                    ? group.items.map(i => i.meal.name).join(', ')
                                    : group.items[0].meal.name}
                                </Text>
                                <Text style={styles.mealTime}>
                                  {MEAL_LABEL[group.mealType]} ·{' '}
                                  {new Date(group.takenAt).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.mealRight}>
                              <Text style={styles.mealGlucides}>
                                {group.totalGlucides > 0
                                  ? `${Math.round(group.totalGlucides * 10) / 10}g`
                                  : '—'}
                              </Text>
                              <Text style={styles.mealGlucidesLabel}>glucides</Text>
                            </View>
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.mealDetails}>
                            {isComposed ? (
                              <>
                                {group.items.map(item => (
                                  <View key={item.id} style={styles.composedItemRow}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.composedItemName}>{item.meal.name}</Text>
                                      <Text style={styles.composedItemMeta}>
                                        {item.portion_g ? `${item.portion_g}g` : ''}
                                        {item.portion_g && item.glucides_consommes != null ? ' · ' : ''}
                                        {item.glucides_consommes != null
                                          ? `${item.glucides_consommes}g gluc.`
                                          : ''}
                                      </Text>
                                    </View>
                                    <TouchableOpacity
                                      style={styles.deleteItemBtn}
                                      onPress={() =>
                                        Alert.alert(
                                          'Supprimer',
                                          `Supprimer "${item.meal.name}" ?`,
                                          [
                                            { text: 'Annuler', style: 'cancel' },
                                            {
                                              text: 'Supprimer',
                                              style: 'destructive',
                                              onPress: async () => {
                                                try {
                                                  await deleteMeal(item.id);
                                                } catch {
                                                  toastError('Erreur', 'Impossible de supprimer cet aliment.');
                                                }
                                              },
                                            },
                                          ]
                                        )
                                      }
                                    >
                                      <Trash2 size={14} color="#DC2626" />
                                    </TouchableOpacity>
                                  </View>
                                ))}
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Total calories</Text>
                                  <Text style={styles.detailValue}>
                                    {group.totalCalories > 0
                                      ? `${Math.round(group.totalCalories)} kcal`
                                      : '—'}
                                  </Text>
                                </View>
                              </>
                            ) : (
                              <>
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Calories</Text>
                                  <Text style={styles.detailValue}>
                                    {group.items[0].calories_consommes != null
                                      ? `${group.items[0].calories_consommes} kcal`
                                      : '—'}
                                  </Text>
                                </View>
                                {group.items[0].portion_g && (
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Portion</Text>
                                    <Text style={styles.detailValue}>{group.items[0].portion_g} g</Text>
                                  </View>
                                )}
                                {group.items[0].notes ? (
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Notes</Text>
                                    <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>
                                      {group.items[0].notes}
                                    </Text>
                                  </View>
                                ) : null}
                              </>
                            )}

                            <View style={styles.actionButtons}>
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteGroup(group)}
                              >
                                <Trash2 size={16} color="#DC2626" />
                                <Text style={styles.deleteButtonText}>Supprimer</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.bottomPadding} />
            </>
          )}
        </ScrollView>

        <AddMealModal
          visible={showAdd}
          submitting={submitting}
          composedItems={composedItems}
          mealType={compositionMealType}
          prefillRef={prefillRef}
          onPrefillConsumed={() => setPrefillRef(null)}
          onMealTypeChange={setCompositionMealType}
          onAddItem={item => setComposedItems(prev => [...prev, item])}
          onRemoveItem={tempId => setComposedItems(prev => prev.filter(i => i.tempId !== tempId))}
          onOpenScanner={() => { setShowAdd(false); setShowScanner(true); }}
          onClose={closeAdd}
          onSubmit={handleSubmit}
        />

        <BarcodeScannerModal
          visible={showScanner}
          onClose={() => { setShowScanner(false); setShowAdd(true); }}
          onProductFound={handleProductFromBarcode}
          onAddManually={() => { setShowScanner(false); setShowAdd(true); }}
        />
      </View>
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
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    maxWidth: 180,
  },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateNavBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Toggle Jour / Semaine
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.textPrimary },

  // Carte récap
  summaryCard: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 12,
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
  summaryLabel: { color: '#B3D9FF', fontSize: 14, marginBottom: 8 },
  summaryValue: { color: '#fff', fontSize: 40, fontWeight: '700' },
  objectifBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  objectifText: { color: '#fff', fontSize: 12 },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    marginBottom: 12,
  },
  progressBar: { height: 12, backgroundColor: '#fff', borderRadius: 6 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 12,
  },
  statLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },

  // Semaine — états loading / vide
  weekLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  weekLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  weekEmptyCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weekEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  weekEmptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  weekEmptyHighlight: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // Bar chart
  barChartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weekChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 138,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    height: 14,
    textAlign: 'center',
  },
  barValueActive: { color: '#007AFF' },
  barTrack: {
    height: 96,
    width: '75%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 5,
    minHeight: 3,
  },
  barActive: { backgroundColor: '#007AFF' },
  barInactive: { backgroundColor: '#BFDBFE' },
  barEmpty: { backgroundColor: '#E5E7EB', height: 3 },
  barDayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  barDayLabelActive: { color: '#007AFF' },

  // Section repas
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  emptySubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  mealsList: { paddingHorizontal: 20, gap: 12 },
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
  mealLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  mealIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIcon: { fontSize: 24 },
  composedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    backgroundColor: '#007AFF',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  mealTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  mealTime: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  mealRight: { alignItems: 'flex-end' },
  mealGlucides: { fontSize: 24, fontWeight: '700', color: '#007AFF' },
  mealGlucidesLabel: { fontSize: 12, color: '#9CA3AF' },
  mealDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  composedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  composedItemName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  composedItemMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  deleteItemBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    marginLeft: 8,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
  },
  deleteButtonText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  bottomPadding: { height: 100 },
});
