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
} from 'react-native';
import { Utensils, Plus, Clock, Edit3, Trash2 } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import SelectList from '../components/common/SelectList';
import IndicatorCard from '../components/common/IndicatorCard';
import { colors } from '../themes/colors';

const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation'];

import { loadMeals } from '../data/sources';
import { storage } from '../data/storage';

export default function RepasScreen({ navigation }) {
  const initialMeals = [
    {
      id: 'm1',
      title: 'Salade César',
      time: '12:30',
      glucides: 25,
      type: 'Déjeuner',
      preGlucose: 110,
      postGlucose: 140,
      notes: '',
    },
  ];

  const [meals, setMeals] = useState(initialMeals);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // form state
  const [description, setDescription] = useState('');
  const [glucides, setGlucides] = useState('');
  const [time, setTime] = useState('12:30');
  const [mealType, setMealType] = useState(MEAL_TYPES[1]);
  const [preGlucose, setPreGlucose] = useState('');
  const [postGlucose, setPostGlucose] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [mealOptions, setMealOptions] = useState([]);

  React.useEffect(() => {
    let mounted = true;
    loadMeals().then(list => {
      if (!mounted) return;
      setMealOptions(list);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => {
    const totalCarbs = meals.reduce((s, m) => s + (m.glucides || 0), 0);
    const mealsCount = meals.length;
    const preValues = meals.filter(m => typeof m.preGlucose === 'number').map(m => m.preGlucose);
    const postValues = meals.filter(m => typeof m.postGlucose === 'number').map(m => m.postGlucose);
    const avg = arr => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    return {
      totalCarbs,
      mealsCount,
      avgPre: avg(preValues),
      avgPost: avg(postValues),
    };
  }, [meals]);

  function openAddModal() {
    setEditingId(null);
    setDescription('');
    setGlucides('');
    setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    setMealType(MEAL_TYPES[0]);
    setPreGlucose('');
    setPostGlucose('');
    setNotes('');
    setIsModalVisible(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setDescription(item.title || '');
    setGlucides(String(item.glucides || ''));
    setTime(item.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    setMealType(item.type || MEAL_TYPES[0]);
    setPreGlucose(item.preGlucose != null ? String(item.preGlucose) : '');
    setPostGlucose(item.postGlucose != null ? String(item.postGlucose) : '');
    setNotes(item.notes || '');
    setIsModalVisible(true);
  }

  function saveMeal() {
    if (!description.trim()) return;
    const payload = {
      id: editingId || `${Date.now()}`,
      title: description.trim(),
      time: time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      glucides: parseInt(glucides || '0', 10),
      type: mealType,
      preGlucose: preGlucose ? parseInt(preGlucose, 10) : undefined,
      postGlucose: postGlucose ? parseInt(postGlucose, 10) : undefined,
      notes: notes || '',
    };

    if (editingId) {
      setMeals(prev => prev.map(m => (m.id === editingId ? payload : m)));
    } else {
      setMeals(prev => [payload, ...prev]);

      // add to suggestions and persist (ensure suggestion has an id to avoid duplicate keys)
      const suggestion = { id: `meal-sugg-${Date.now()}`, name: payload.title, glucides: payload.glucides, type: payload.type };
      const updated = [(suggestion), ...mealOptions];
      setMealOptions(updated);
      storage.setMeals(updated);
    }

    setIsModalVisible(false);
  }

  function deleteMeal(id) {
    setMeals(prev => prev.filter(m => m.id !== id));
    setIsModalVisible(false);
  }

  function MealItem({ item }) {
    return (
      <TouchableOpacity style={styles.mealCard} onPress={() => openEditModal(item)} activeOpacity={0.8}>
        <View style={styles.mealLeft}>
          <View style={styles.iconCircle}>
            <Utensils size={20} color="#007AFF" strokeWidth={2.5} />
          </View>
          <View style={styles.mealInfo}>
            <View style={styles.mealTitleRow}>
              <Text style={styles.mealTitle} numberOfLines={1} ellipsizeMode={'tail'}>{item.title}</Text>
              <Text style={styles.mealType} numberOfLines={1} ellipsizeMode={'tail'}>{item.type}</Text>
            </View>

            <View style={styles.mealMeta}>
              <Clock size={13} color={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.mealTime}>{item.time}</Text>
              {item.preGlucose != null && (
                <Text style={styles.smallBadge}>Pré: {item.preGlucose}</Text>
              )}
              {item.postGlucose != null && (
                <Text style={styles.smallBadge}>Post: {item.postGlucose}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.mealRight}>
          <View style={styles.glucBadge}>
            <Text style={styles.glucText}>{item.glucides}g</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Layout navigation={navigation} currentRoute="Home" userName="Utilisateur" onNotificationPress={() => console.log('Notifications')}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.title}>Nutrition</Text>
            <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.9}>
              <Plus color="#FFFFFF" size={22} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <IndicatorCard title="Glucides totaux" value={`${totals.totalCarbs}g`} subtitle={`${totals.mealsCount} repas`} />
            <IndicatorCard
              title="Impact glycémique moyen"
              value={(() => {
                if (totals.avgPre == null || totals.avgPost == null) return '—';
                const delta = (totals.avgPost - totals.avgPre);
                return `${delta > 0 ? '+' : ''}${delta} mg/dL`;
              })()}
              subtitle={(() => {
                if (totals.avgPre == null || totals.avgPost == null) return 'Données insuffisantes';
                const delta = totals.avgPost - totals.avgPre;
                if (delta > 20) return 'Impact élevé après repas';
                if (delta >= 6) return 'Impact modéré après repas';
                return 'Impact faible après repas';
              })()}
              color={totals.avgPost != null && totals.avgPre != null ? ( (totals.avgPost - totals.avgPre) > 20 ? '#FF3B30' : ((totals.avgPost - totals.avgPre) >= 6 ? '#FF9F0A' : '#34C759') ) : '#007AFF'}
              style={{ marginLeft: 12 }}
            />
          </View>

          <View style={styles.listContainer}>
            {meals.map(m => <MealItem key={m.id} item={m} />)}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Modal bottom sheet for add/edit */}
        <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={() => setIsModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)} />
          <View style={[styles.modalContainer, Platform.OS === 'ios' ? { paddingBottom: 34 } : null]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Utensils size={22} color="#007AFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.modalTitle}>{editingId ? 'Modifier Repas' : 'Nouveau Repas'}</Text>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.modalForm}>
                <View style={styles.suggestionRow}>
                  <SelectList
                    options={mealOptions}
                    value={description}
                    onValueChange={(val) => {
                      setDescription(val);
                      const s = (mealOptions || []).find(m => m.name === val);
                      if (s) { setGlucides(String(s.glucides)); setMealType(s.type); }
                    }}
                    placeholder="Suggestions"
                    renderItemLabel={m => `${m.name} (${m.glucides}g)`}
                    style={{ flex: 1 }}
                  />

                  <TouchableOpacity 
                    style={styles.clearButton} 
                    onPress={() => { setDescription(''); setGlucides(''); }} 
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clearButtonText}>Effacer</Text>
                  </TouchableOpacity>
                </View>

                <TextInput 
                  style={styles.input} 
                  placeholder="Description (ex: Salade composée)" 
                  placeholderTextColor="#bdbdbd" 
                  value={description} 
                  onChangeText={setDescription} 
                />

                <View style={styles.inputRow}>
                  <TextInput 
                    style={[styles.input, styles.inputFlex]} 
                    placeholder="Glucides estimés (g)" 
                    placeholderTextColor="#bdbdbd" 
                    keyboardType="numeric" 
                    value={glucides} 
                    onChangeText={setGlucides} 
                  />
                  <TextInput 
                    style={[styles.input, styles.inputTime]} 
                    placeholder="Heure" 
                    placeholderTextColor="#bdbdbd" 
                    value={time} 
                    onChangeText={setTime} 
                  />
                </View>

                <SelectList
                  options={(MEAL_TYPES || []).map(m => ({ name: m }))}
                  value={mealType}
                  onValueChange={setMealType}
                  placeholder="Type de repas"
                  style={{ marginBottom: 16 }}
                />

                <View style={styles.inputRow}>
                  <TextInput 
                    style={[styles.input, styles.inputFlex]} 
                    placeholder="Glycémie pré (mg/dL)" 
                    placeholderTextColor="#bdbdbd" 
                    keyboardType="numeric" 
                    value={preGlucose} 
                    onChangeText={setPreGlucose} 
                  />
                  <TextInput 
                    style={[styles.input, styles.inputFlex]} 
                    placeholder="Glycémie post (mg/dL)" 
                    placeholderTextColor="#bdbdbd" 
                    keyboardType="numeric" 
                    value={postGlucose} 
                    onChangeText={setPostGlucose} 
                  />
                </View>

                {/* Indicateur d'impact pour ce repas */}
                <View style={styles.impactContainer}>
                  <IndicatorCard
                    title="Impact estimé"
                    value={(() => {
                      const g = parseInt(glucides || '0', 10);
                      if (!g) return '—';
                      if (g > 50) return 'Élevé';
                      if (g >= 20) return 'Modéré';
                      return 'Faible';
                    })()}
                    subtitle={`~${glucides || 0} g de glucides`}
                    color={( () => { const g = parseInt(glucides || '0', 10); if (!g) return '#8E8E93'; if (g > 50) return '#FF3B30'; if (g >= 20) return '#FF9F0A'; return '#34C759'; })()}
                  />
                </View>

                <TextInput 
                  style={[styles.input, styles.inputNotes]} 
                  placeholder="Notes" 
                  placeholderTextColor="#bdbdbd" 
                  value={notes} 
                  onChangeText={setNotes} 
                  multiline 
                  textAlignVertical="top"
                />

                <View style={styles.buttonRow}>
                  {editingId && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteMeal(editingId)} activeOpacity={0.8}>
                      <Trash2 size={18} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.deleteText}>Supprimer</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.addModalBtn, editingId ? styles.addModalBtnWithDelete : null]} onPress={saveMeal} activeOpacity={0.8}>
                    <Text style={styles.addModalText}>{editingId ? 'Enregistrer' : 'Ajouter'}</Text>
                  </TouchableOpacity>
                </View>
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
  scrollContent: {
    flex: 1,
  },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },

  listContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },

  mealCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  mealInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mealTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  mealType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 0,
  },
  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  mealTime: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  smallBadge: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  mealRight: {
    justifyContent: 'center',
  },

  glucBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  glucText: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 15,
  },

  bottomPadding: {
    height: 100,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: '80%',
  },
  modalScrollView: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sheetHandle: {
    height: 5,
    width: 40,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    borderRadius: 3,
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalForm: {
    marginTop: 0,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  clearButton: {
    height: 52,
    width: 110,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontWeight: '600',
    color: colors.textSecondary,
    fontSize: 15,
  },
  input: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputFlex: {
    flex: 1,
    marginBottom: 16,
  },
  inputTime: {
    width: 110,
    marginBottom: 16,
  },
  inputNotes: {
    height: 90,
    paddingTop: 16,
    paddingBottom: 16,
  },
  impactContainer: {
    marginTop: 0,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  deleteBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  addModalBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    flex: 1,
  },
  addModalBtnWithDelete: {
    flex: 1,
  },
  addModalText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});