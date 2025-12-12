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
import { Pill, Plus, Check, Clock } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';

export default function TraitementsScreen({ navigation }) {
  const initialToTake = [
    {
      id: 't1',
      name: 'Insuline Lente',
      time: '22:00',
      dosage: '18 unités',
    },
  ];
  const initialHistory = [
    {
      id: 'h1',
      name: 'Metformine',
      time: '08:00',
      dosage: '850mg',
    },
  ];

  const [toTake, setToTake] = useState(initialToTake);
  const [history, setHistory] = useState(initialHistory);

  const [currentTab, setCurrentTab] = useState('toTake');

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00');

  function addTreatment() {
    if (!name.trim()) return;
    const newItem = {
      id: `${Date.now()}`,
      name,
      dosage,
      time,
    };
    setToTake(prev => [newItem, ...prev]);
    setModalVisible(false);
    setName('');
    setDosage('');
    setTime('08:00');
  }

  function markAsTaken(itemId) {
    const item = toTake.find(t => t.id === itemId);
    if (!item) return;
    setToTake(prev => prev.filter(t => t.id !== itemId));
    setHistory(prev => [item, ...prev]);
  }

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
            <Text style={[styles.timeText, taken ? styles.timeTextTaken : null]}>
              {item.time}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, taken ? styles.cardTitleTaken : null]}>
              {item.name}
            </Text>
            <Text style={[styles.cardSubtitle, taken ? styles.cardSubtitleTaken : null]}>
              {item.dosage}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          {taken ? (
            <View style={styles.takenBadge}>
              <Check size={16} color="#fff" strokeWidth={2} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.takeBtn}
              onPress={() => markAsTaken(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.takeText}>Prendre</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Layout
      navigation={navigation}
      currentRoute="Home"
      userName="Utilisateur"
      onNotificationPress={() => console.log('Notifications')}
    >
      <View style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Traitements</Text>
            <TouchableOpacity
              style={styles.addFloating}
              activeOpacity={0.9}
              onPress={() => setModalVisible(true)}
            >
              <Plus color="#fff" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, currentTab === 'toTake' ? styles.tabActive : null]}
              onPress={() => setCurrentTab('toTake')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, currentTab === 'toTake' ? styles.tabTextActive : null]}>
                À prendre
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, currentTab === 'history' ? styles.tabActive : null]}
              onPress={() => setCurrentTab('history')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, currentTab === 'history' ? styles.tabTextActive : null]}>
                Historique
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {currentTab === 'toTake' ? (
              toTake.map(item => (
                <TreatmentItem
                  key={item.id}
                  item={item}
                  taken={false}
                  onPress={() => console.log('Open', item.id)}
                />
              ))
            ) : (
              <>
                <View style={styles.adherenceCard}>
                  <Text style={styles.adherenceLabel}>ADHÉSION</Text>
                  <Text style={styles.adherenceValue}>7%</Text>
                  <View style={styles.adherenceBadge}>
                    <Check size={18} color="#fff" strokeWidth={2} />
                  </View>
                </View>

                {history.map(item => (
                  <TreatmentItem
                    key={item.id}
                    item={item}
                    taken={true}
                    onPress={() => console.log('Open history', item.id)}
                  />
                ))}
              </>
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)} />

          <View style={[styles.modalContainer, Platform.OS === 'ios' ? { paddingBottom: 34 } : null]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Pill color={colors.secondary} size={20} />
              <Text style={styles.modalTitle}>Nouveau Traitement</Text>
            </View>

            <View style={styles.modalForm}>
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

              <TouchableOpacity style={styles.programButton} onPress={addTreatment} activeOpacity={0.85}>
                <Text style={styles.programText}>Programmer</Text>
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
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  addFloating: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },

  tabsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E7E8F1',
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },

  listContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTaken: {
    opacity: 0.5,
    backgroundColor: '#FAFAFB',
  },
  cardLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  timeBox: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardTitleTaken: {
    textDecorationLine: 'line-through',
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardSubtitleTaken: {
    textDecorationLine: 'line-through',
  },

  cardRight: {
    marginLeft: 8,
  },
  takeBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  takeText: {
    color: colors.secondary,
    fontWeight: '700',
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
    padding: 20,
    marginBottom: 12,
  },
  adherenceLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    opacity: 0.95,
  },
  adherenceValue: {
    color: '#fff',
    marginTop: 10,
    fontSize: 40,
    fontWeight: '800',
  },
  adherenceBadge: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  sheetHandle: {
    height: 6,
    width: 60,
    backgroundColor: '#E7E7EE',
    alignSelf: 'center',
    borderRadius: 3,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalForm: {
    marginTop: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FAFAFB',
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  programButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  programText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});