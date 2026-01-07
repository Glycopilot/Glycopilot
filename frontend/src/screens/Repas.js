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
import { Utensils, Plus, Clock } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';


export default function RepasScreen({ navigation }) {
  const initialMeals = [
    {
      id: 'm1',
      title: 'Salade César',
      time: '12:30',
      glucides: 25,
    },
  ];

  const [meals, setMeals] = useState(initialMeals);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [glucides, setGlucides] = useState('');
  const [time, setTime] = useState('12:30');

  function addMeal() {
    if (!description.trim()) return;
    const newMeal = {
      id: `${Date.now()}`,
      title: description,
      time: time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      glucides: parseInt(glucides || '0', 10),
    };
    setMeals(prev => [newMeal, ...prev]);
    setIsModalVisible(false);
    setDescription('');
    setGlucides('');
    setTime('12:30');
  }

  function MealItem({ item }) {
    return (
      <View style={styles.mealCard}>
        <View style={styles.mealLeft}>
          <View style={[styles.iconCircle, { backgroundColor: '#f1f1f1ff' }]}>
            <Utensils size={18} color={colors.textPrimary} />
          </View>
          <View style={styles.mealInfo}>
            <Text style={styles.mealTitle}>{item.title}</Text>
            <View style={styles.mealMeta}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={styles.mealTime}>{item.time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.mealRight}>
          <View style={styles.glucBadge}>
            <Text style={styles.glucText}>{item.glucides}g</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Layout navigation={navigation} currentRoute="Home" userName="Utilisateur" onNotificationPress={() => console.log('Notifications')}>
      <View style={{ flex: 1 }}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.title}>Nutrition</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)} activeOpacity={0.9}>
              <Plus color="#FFFFFF" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>70g</Text>
              <Text style={styles.statLabel}>GLUCIDES</Text>
            </View>
            <View style={[styles.statCard, { marginLeft: 12 }]}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>REPAS</Text>
            </View>
          </View>

          <View style={styles.listContainer}>
            {meals.map(m => <MealItem key={m.id} item={m} />)}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Modal bottom sheet */}
        <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={() => setIsModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)} />
          <View style={[styles.modalContainer, Platform.OS === 'ios' ? { paddingBottom: 34 } : null]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Utensils size={18} color={'#000'} />
              <Text style={styles.modalTitle}>Nouveau Repas</Text>
            </View>

            <View style={styles.modalForm}>
              <TextInput style={styles.input} placeholder="Description (ex: Salade composée)" placeholderTextColor="#bdbdbd" value={description} onChangeText={setDescription} />
              <TextInput style={styles.input} placeholder="Glucides estimés (g)" placeholderTextColor="#bdbdbd" keyboardType="numeric" value={glucides} onChangeText={setGlucides} />
              <TextInput style={styles.input} placeholder="Heure (ex: 12:30)" placeholderTextColor="#bdbdbd" value={time} onChangeText={setTime} />
              <TouchableOpacity style={styles.addModalBtn} onPress={addMeal} activeOpacity={0.85}>
                <Text style={styles.addModalText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
  },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 6,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },

  listContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
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
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  mealTime: {
    color: colors.textPrimary,
    fontSize: 13,
  },

  mealRight: {
    marginLeft: 12,
  },

  glucBadge: {
    backgroundColor: '#e1e7fcff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  glucText: {
    color: '#007AFF',
    fontWeight: '700',
  },

  bottomPadding: {
    height: 100,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.34)',
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
    backgroundColor: '#eaeaeaff',
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
    color: '#000',
  },
  addModalBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  addModalText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});