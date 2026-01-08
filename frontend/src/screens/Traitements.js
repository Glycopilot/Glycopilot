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
import { Pill, Plus, Check, Clock, Trash2 } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import SelectList from '../components/common/SelectList';
import IndicatorCard from '../components/common/IndicatorCard';
import { colors } from '../themes/colors';
import { loadTreatments } from '../data/sources';
import { storage } from '../data/storage';

export default function TraitementsScreen({ navigation }) {
  const initialToTake = [
    {
      id: 't1',
      name: 'Insuline Lente',
      time: '22:00',
      dosage: '18 unités',
      type: 'Insuline',
    },
  ];
  const initialHistory = [
    {
      id: 'h1',
      name: 'Metformine',
      time: '08:00',
      dosage: '850mg',
      takenAt: '08:05',
      actualDosage: '850mg',
    },
  ];

  const [toTake, setToTake] = useState(initialToTake);
  const [history, setHistory] = useState(initialHistory);

  const [currentTab, setCurrentTab] = useState('toTake');

  // add/edit modal
  const [modalVisible, setModalVisible] = useState(false);

  // indicator helpers
  const lastTaken = history && history.length ? history[0] : null;
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00');
  const [medType, setMedType] = useState('Insuline');

  const [treatOptions, setTreatOptions] = useState([]);

  React.useEffect(() => {
    let mounted = true;
    loadTreatments().then(list => {
      if (!mounted) return;
      setTreatOptions(list);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // take modal: confirm dose actually taken
  const [takeModalVisible, setTakeModalVisible] = useState(false);
  const [takeTargetId, setTakeTargetId] = useState(null);
  const [actualDose, setActualDose] = useState('');
  const [takenTime, setTakenTime] = useState('');

  const TREATMENT_TYPES = ['Insuline', 'Oral', 'Autre'];

  function openAddModal() {
    setEditingId(null);
    setName('');
    setDosage('');
    setTime('08:00');
    setMedType('Insuline');
    setModalVisible(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setName(item.name || '');
    setDosage(item.dosage || '');
    setTime(item.time || '08:00');
    setMedType(item.type || 'Insuline');
    setModalVisible(true);
  }

  function saveTreatment() {
    if (!name.trim()) return;
    const payload = {
      id: editingId || `${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      time,
      type: medType,
    };
    if (editingId) {
      setToTake(prev => prev.map(t => (t.id === editingId ? payload : t)));
    } else {
      setToTake(prev => [payload, ...prev]);

      // add to suggestions and persist (ensure suggestion has an id to avoid duplicate keys)
      const suggestion = { id: `treat-sugg-${Date.now()}`, name: payload.name, dosage: payload.dosage, type: payload.type };
      const updated = [suggestion, ...treatOptions];
      setTreatOptions(updated);
      storage.setTreatments(updated);
    }
    setModalVisible(false);
  }

  function deleteTreatment(id) {
    setToTake(prev => prev.filter(t => t.id !== id));
    setHistory(prev => prev.filter(h => h.id !== id));
    setModalVisible(false);
  }

  function openTakeModal(id) {
    setTakeTargetId(id);
    setActualDose('');
    setTakenTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    setTakeModalVisible(true);
  }

  function confirmTake() {
    if (!takeTargetId) return;
    const item = toTake.find(t => t.id === takeTargetId);
    if (!item) return;
    const record = {
      ...item,
      takenAt: takenTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      actualDosage: actualDose || item.dosage,
    };
    setToTake(prev => prev.filter(t => t.id !== takeTargetId));
    setHistory(prev => [record, ...prev]);
    setTakeModalVisible(false);
  }

  const adherence = Math.round((history.length / Math.max(1, history.length + toTake.length)) * 100);

  function TreatmentItem({ item, onPress, taken }) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          taken ? styles.cardTaken : {},
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.timeBox, taken ? styles.timeBoxTaken : null]}> 
            <Text style={[styles.timeText, taken ? styles.timeTextTaken : null]}>{item.time}</Text>
          </View>

          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, taken ? styles.cardTitleTaken : null]} numberOfLines={1} ellipsizeMode={'tail'}>{item.name}</Text>
            <Text style={[styles.cardSubtitle, taken ? styles.cardSubtitleTaken : null]} numberOfLines={1} ellipsizeMode={'tail'}>
              {item.dosage} {taken && item.actualDosage ? `• pris: ${item.actualDosage}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          {taken ? (
            <View style={styles.takenBadge}>
              <Check size={18} color="#fff" strokeWidth={2.5} />
            </View>
          ) : (
            <TouchableOpacity style={styles.takeBtn} onPress={() => openTakeModal(item.id)} activeOpacity={0.8}>
              <Text style={styles.takeText}>Prendre</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Layout navigation={navigation} currentRoute="Home" userName="Utilisateur" onNotificationPress={() => console.log('Notifications')}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Traitements</Text>
            <TouchableOpacity style={styles.addFloating} activeOpacity={0.9} onPress={openAddModal}>
              <Plus color="#fff" size={22} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabsRow}>
            <TouchableOpacity 
              style={[styles.tab, currentTab === 'toTake' ? styles.tabActive : null]} 
              onPress={() => setCurrentTab('toTake')} 
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, currentTab === 'toTake' ? styles.tabTextActive : null]}>À prendre</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, currentTab === 'history' ? styles.tabActive : null]} 
              onPress={() => setCurrentTab('history')} 
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, currentTab === 'history' ? styles.tabTextActive : null]}>Historique</Text>
            </TouchableOpacity>
          </View>

          {/* Indicators */}
          <View style={styles.indicatorsContainer}>
            <View style={styles.indicatorsRow}>
              <IndicatorCard 
                title="À prendre" 
                value={toTake.length || 0} 
                subtitle={`${toTake.length} planifié(s)`} 
                style={styles.indicatorFlex}
              />
              <IndicatorCard 
                title="Prescription respectée" 
                value={`${adherence}%`} 
                subtitle={`${history.length + toTake.length} médicaments`} 
                style={styles.indicatorFlex}
              />
            </View>
            <View style={styles.indicatorFullWidth}>
              <IndicatorCard 
                title="Dernier pris" 
                value={lastTaken ? lastTaken.name : '—'} 
                subtitle={lastTaken ? `Pris à ${lastTaken.takenAt}` : 'Aucun traitement pris'} 
              />
            </View>
          </View>

          <View style={styles.listContainer}>
            {currentTab === 'toTake' ? (
              toTake.map(item => (
                <TreatmentItem key={item.id} item={item} taken={false} onPress={() => openEditModal(item)} />
              ))
            ) : (
              <>
                <View style={styles.adherenceCard}>
                  <Text style={styles.adherenceLabel}>Prescription respectée</Text>
                  <Text style={styles.adherenceValue}>{adherence}%</Text>
                  <View style={styles.adherenceBadge}>
                    <Check size={20} color="#fff" strokeWidth={2.5} />
                  </View>
                </View>

                {history.map(item => (
                  <TreatmentItem key={item.id} item={item} taken={true} onPress={() => console.log('Open history', item.id)} />
                ))}
              </>
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* add/edit modal */}
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContainer, Platform.OS === 'ios' ? { paddingBottom: 34 } : null]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Pill size={22} color="#9C27B0" strokeWidth={2.5} />
              </View>
              <Text style={styles.modalTitle}>{editingId ? 'Modifier Traitement' : 'Nouveau Traitement'}</Text>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.modalForm}>
                <View style={styles.suggestionRow}>
                  <SelectList
                    options={treatOptions}
                    value={name}
                    onValueChange={(val) => {
                      setName(val);
                      const s = (treatOptions || []).find(t => t.name === val);
                      if (s) { setDosage(s.dosage); setMedType(s.type); }
                    }}
                    placeholder="Suggestions"
                    renderItemLabel={t => `${t.name} (${t.dosage})`}
                    style={{ flex: 1 }}
                  />
                  <TouchableOpacity 
                    style={styles.clearButton} 
                    onPress={() => { setName(''); setDosage(''); }} 
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clearButtonText}>Effacer</Text>
                  </TouchableOpacity>
                </View>

                <TextInput 
                  style={styles.input} 
                  placeholder="Nom du médicament" 
                  placeholderTextColor="#bdbdbd" 
                  value={name} 
                  onChangeText={setName} 
                />
                <TextInput 
                  style={styles.input} 
                  placeholder="Dosage (ex: 500mg)" 
                  placeholderTextColor="#bdbdbd" 
                  value={dosage} 
                  onChangeText={setDosage} 
                />
                <TextInput 
                  style={styles.input} 
                  placeholder="Heure (ex: 08:00)" 
                  placeholderTextColor="#bdbdbd" 
                  value={time} 
                  onChangeText={setTime} 
                />

                <SelectList
                  options={(TREATMENT_TYPES || []).map(t => ({ name: t }))}
                  value={medType}
                  onValueChange={setMedType}
                  placeholder="Type de traitement"
                  style={{ marginBottom: 16 }}
                />

                <View style={styles.buttonRow}>
                  {editingId && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteTreatment(editingId)} activeOpacity={0.8}>
                      <Trash2 size={18} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.deleteText}>Supprimer</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.programButton, editingId ? styles.programButtonWithDelete : null]} 
                    onPress={saveTreatment} 
                    activeOpacity={0.8}
                  >
                    <Text style={styles.programText}>{editingId ? 'Enregistrer' : 'Programmer'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* take modal */}
        <Modal visible={takeModalVisible} animationType="slide" transparent onRequestClose={() => setTakeModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setTakeModalVisible(false)} />
          <View style={[styles.modalContainer, Platform.OS === 'ios' ? { paddingBottom: 34 } : null]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Check size={22} color="#9C27B0" strokeWidth={2.5} />
              </View>
              <Text style={styles.modalTitle}>Prendre le traitement</Text>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.modalForm}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Dose réellement prise (ex: 18 unités)" 
                  placeholderTextColor="#bdbdbd" 
                  value={actualDose} 
                  onChangeText={setActualDose} 
                />
                <TextInput 
                  style={styles.input} 
                  placeholder="Heure prise (ex: 22:02)" 
                  placeholderTextColor="#bdbdbd" 
                  value={takenTime} 
                  onChangeText={setTakenTime} 
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => setTakeModalVisible(false)} 
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.programButton, styles.confirmButton]} 
                    onPress={confirmTake} 
                    activeOpacity={0.8}
                  >
                    <Text style={styles.programText}>Confirmer</Text>
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
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  addFloating: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  tabsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },

  indicatorsContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  indicatorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  indicatorFlex: {
    flex: 1,
  },
  indicatorFullWidth: {
    width: '100%',
  },

  listContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTaken: {
    opacity: 0.6,
    backgroundColor: '#FAFAFB',
  },
  cardLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  timeBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBoxTaken: {
    backgroundColor: '#EDEEF2',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeTextTaken: {
    color: colors.textSecondary,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardTitleTaken: {
    textDecorationLine: 'line-through',
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardSubtitleTaken: {
    textDecorationLine: 'line-through',
  },

  cardRight: {
    justifyContent: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  takeBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  takeText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
  takenBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // adherence card style
  adherenceCard: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  adherenceLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
    opacity: 0.9,
  },
  adherenceValue: {
    color: '#fff',
    marginTop: 12,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  adherenceBadge: {
    position: 'absolute',
    right: 24,
    top: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // bottom padding
  bottomPadding: {
    height: 100,
  },

  // modal
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
    backgroundColor: '#F3E5F5',
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
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  programButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    flex: 1,
  },
  programButtonWithDelete: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
  programText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
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
  cancelBtn: {
    backgroundColor: '#F5F5F7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 17,
  },
});