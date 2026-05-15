import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X, Search, Plus } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import mealService from '../../services/mealService';
import type {
  MealType,
  MealReference,
  OpenFoodProduct,
  ComposedItem,
} from '../../types/meals.types';

const MEAL_TYPES: Array<{ key: MealType; label: string }> = [
  { key: 'breakfast', label: 'Petit-déjeuner' },
  { key: 'lunch', label: 'Déjeuner' },
  { key: 'snack', label: 'Collation' },
  { key: 'dinner', label: 'Dîner' },
];

type FormTab = 'manual' | 'search';

export function calcItemGlucides(item: ComposedItem): number | null {
  const g = Number.parseFloat(item.glucidesRaw);
  const p = Number.parseFloat(item.portionG);
  if (Number.isNaN(g) || Number.isNaN(p) || p <= 0) {
    return null;
  }
  return Math.round((g * p) / 10) / 10;
}

interface Props {
  visible: boolean;
  submitting: boolean;
  composedItems: ComposedItem[];
  mealType: MealType;
  prefillRef: MealReference | null;
  onPrefillConsumed: () => void;
  onMealTypeChange: (type: MealType) => void;
  onAddItem: (item: ComposedItem) => void;
  onRemoveItem: (tempId: string) => void;
  onOpenScanner: () => void;
  onClose: () => void;
  onSubmit: (pendingItem: ComposedItem | null) => void;
}

export default function AddMealModal({
  visible,
  submitting,
  composedItems,
  mealType,
  prefillRef,
  onPrefillConsumed,
  onMealTypeChange,
  onAddItem,
  onRemoveItem,
  onOpenScanner,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const [tab, setTab] = useState<FormTab>('manual');
  const [name, setName] = useState('');
  const [selectedRef, setSelectedRef] = useState<MealReference | null>(null);
  const [portionG, setPortionG] = useState('');
  const [glucidesRaw, setGlucidesRaw] = useState('');
  const [caloriesRaw, setCaloriesRaw] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OpenFoodProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && prefillRef) {
      setSelectedRef(prefillRef);
      setName(prefillRef.name);
      setGlucidesRaw(prefillRef.glucides == null ? '' : String(prefillRef.glucides));
      setCaloriesRaw(prefillRef.calories == null ? '' : String(prefillRef.calories));
      setPortionG('');
      setTab('manual');
      onPrefillConsumed();
    }
  }, [visible, prefillRef]);

  const clearForm = () => {
    setName('');
    setSelectedRef(null);
    setPortionG('');
    setGlucidesRaw('');
    setCaloriesRaw('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const results = await mealService.searchOpenFoodFacts(text);
      setSearchResults(results);
      setSearching(false);
    }, 600);
  };

  const selectProduct = (product: OpenFoodProduct) => {
    setSelectedRef({
      meal_id: -1,
      name: product.name,
      calories: product.calories,
      glucides: product.glucides,
      proteines: product.proteines,
      lipides: product.lipides,
      glucose: null,
      barcode: product.barcode,
      source: 'openfood',
      link_photo: product.image_url,
    });
    setName(product.name);
    setGlucidesRaw(product.glucides == null ? '' : String(product.glucides));
    setCaloriesRaw(product.calories == null ? '' : String(product.calories));
    setSearchResults([]);
    setTab('manual');
    Keyboard.dismiss();
  };

  const buildCurrentItem = (): ComposedItem | null => {
    if (!name.trim()) return null;
    return {
      tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      selectedRef,
      portionG,
      glucidesRaw,
      caloriesRaw,
    };
  };

  const handleAddToList = () => {
    const item = buildCurrentItem();
    if (!item) return;
    onAddItem(item);
    clearForm();
  };

  const handleSubmitPress = () => {
    onSubmit(buildCurrentItem());
  };

  const totalGlucides = composedItems.reduce((sum, item) => {
    const g = calcItemGlucides(item);
    return g == null ? sum : sum + g;
  }, 0);

  const currentPreview = (() => {
    if (!glucidesRaw || !portionG) return null;
    const g = Number.parseFloat(glucidesRaw);
    const p = Number.parseFloat(portionG);
    if (Number.isNaN(g) || Number.isNaN(p) || p <= 0) return null;
    return Math.round((g * p) / 10) / 10;
  })();

  const totalItems = composedItems.length + (name.trim() ? 1 : 0);
  const canSubmit = totalItems > 0;
  const canAdd = name.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={[styles.sheet, Platform.OS === 'ios' && { paddingBottom: 34 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Composer un repas</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Type de repas */}
            <Text style={styles.label}>Type de repas</Text>
            <View style={styles.mealTypeGrid}>
              {MEAL_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.mealTypeBtn, mealType === t.key && styles.mealTypeBtnActive]}
                  onPress={() => onMealTypeChange(t.key)}
                >
                  <Text style={[styles.mealTypeLabel, mealType === t.key && styles.mealTypeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chips des aliments ajoutés */}
            {composedItems.length > 0 && (
              <View style={styles.chipsSection}>
                <View style={styles.chipsHeader}>
                  <Text style={styles.chipsTitle}>Aliments ajoutés</Text>
                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeText}>
                      {Math.round(totalGlucides * 10) / 10}g glucides
                    </Text>
                  </View>
                </View>
                <View style={styles.chipsRow}>
                  {composedItems.map(item => {
                    const g = calcItemGlucides(item);
                    return (
                      <View key={item.tempId} style={styles.chip}>
                        <Text style={styles.chipText} numberOfLines={1}>
                          {item.name}
                          {g == null ? null : (
                            <Text style={styles.chipGlucides}> · {g}g</Text>
                          )}
                        </Text>
                        <TouchableOpacity
                          onPress={() => onRemoveItem(item.tempId)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={12} color="#fff" strokeWidth={3} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Formulaire aliment */}
            <Text style={styles.label}>
              {composedItems.length === 0 ? 'Aliment' : 'Ajouter un aliment'}
            </Text>

            {/* Onglets + scanner */}
            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, tab === 'manual' && styles.tabActive]}
                onPress={() => { setTab('manual'); clearForm(); }}
              >
                <Text style={[styles.tabText, tab === 'manual' && styles.tabTextActive]}>
                  Manuel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, tab === 'search' && styles.tabActive]}
                onPress={() => { setTab('search'); clearForm(); }}
              >
                <Text style={[styles.tabText, tab === 'search' && styles.tabTextActive]}>
                  Recherche
                </Text>
              </Pressable>
              <Pressable style={styles.tab} onPress={onOpenScanner}>
                <Text style={styles.tabText}>Scanner</Text>
              </Pressable>
            </View>

            {/* Recherche Open Food Facts */}
            {tab === 'search' && (
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Search size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    placeholder="Yaourt, riz basmati…"
                    placeholderTextColor="#9CA3AF"
                  />
                  {searching && <ActivityIndicator size="small" color="#007AFF" />}
                </View>
                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((product) => (
                      <Pressable
                        key={product.barcode ?? product.name}
                        style={styles.searchResultItem}
                        onPress={() => selectProduct(product)}
                      >
                        <Text style={styles.searchResultName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.searchResultMeta}>
                          {product.glucides == null ? '' : `${product.glucides}g gluc.`}
                          {product.glucides == null || product.calories == null ? '' : ' · '}
                          {product.calories == null ? '' : `${product.calories} kcal`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Champs du formulaire */}
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (selectedRef && text !== selectedRef.name) setSelectedRef(null);
              }}
              placeholder="Pomme, pain complet, jus d'orange…"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sublabel}>Glucides (g/100g)</Text>
                <TextInput
                  style={styles.input}
                  value={glucidesRaw}
                  onChangeText={setGlucidesRaw}
                  placeholder="12"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sublabel}>Portion (g)</Text>
                <TextInput
                  style={styles.input}
                  value={portionG}
                  onChangeText={setPortionG}
                  placeholder="150"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {currentPreview != null && (
              <Text style={styles.preview}>→ {currentPreview}g glucides pour cette portion</Text>
            )}

            {/* Bouton Ajouter à la liste */}
            <TouchableOpacity
              style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
              onPress={handleAddToList}
              disabled={!canAdd}
            >
              <Plus size={16} color={canAdd ? '#007AFF' : '#9CA3AF'} />
              <Text style={[styles.addBtnText, !canAdd && styles.addBtnTextDisabled]}>
                Ajouter un aliment
              </Text>
            </TouchableOpacity>

            {/* Boutons principaux */}
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { clearForm(); onClose(); }}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={handleSubmitPress}
                disabled={submitting || !canSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {totalItems > 1
                      ? `Enregistrer (${totalItems})`
                      : 'Enregistrer'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '92%',
  },
  handle: {
    width: 48,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  sublabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  mealTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  mealTypeBtn: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  mealTypeBtnActive: { borderColor: '#007AFF', backgroundColor: '#EBF5FF' },
  mealTypeLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  mealTypeLabelActive: { color: '#007AFF' },

  // Chips
  chipsSection: {
    marginBottom: 20,
  },
  chipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  totalBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '80%',
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  chipGlucides: {
    color: '#93C5FD',
    fontWeight: '400',
  },

  // Tabs
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#007AFF' },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  tabTextActive: { color: '#fff' },

  // Recherche
  searchContainer: { marginBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary },
  searchResults: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    maxHeight: 200,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  searchResultName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  searchResultMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Formulaire
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  preview: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 16,
    marginTop: -4,
  },

  // Bouton Ajouter
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addBtnDisabled: { borderColor: '#E5E7EB' },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
  addBtnTextDisabled: { color: '#9CA3AF' },

  // Boutons principaux
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  submitBtn: {
    flex: 2,
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
  submitBtnDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
