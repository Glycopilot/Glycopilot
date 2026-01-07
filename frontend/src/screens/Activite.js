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
import { Activity as ActivityIcon, Plus, Bike, Walk } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';

export default function ActiviteScreen({ navigation }) {
  const initialData = [
    {
      id: '1',
      title: 'Marche',
      date: '10/12/2025',
      duration: 30,
      kcal: 105,
    },
  ];

  const [activities, setActivities] = useState(initialData);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activityType, setActivityType] = useState('Marche');
  const [duration, setDuration] = useState('30');

  const caloriesPerMinute = useMemo(() => {
    return {
      Marche: 4.3,
      Vélo: 6.2,
      Course: 8.0,
    };
  }, []);

  const estimatedKcal = useMemo(() => {
    const d = parseInt(duration || '0', 10) || 0;
    const kcalPerMin = caloriesPerMinute[activityType] || 4.3;
    return Math.round(kcalPerMin * d);
  }, [activityType, duration, caloriesPerMinute]);

  function addActivity() {
    const newActivity = {
      id: `${Date.now()}`,
      title: activityType,
      date: new Date().toLocaleDateString('fr-FR'),
      duration: parseInt(duration, 10) || 0,
      kcal: estimatedKcal,
    };
    setActivities(prev => [newActivity, ...prev]);
    setIsModalVisible(false);
    setDuration('30');
    setActivityType('Marche');
  }

  const ActivityItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.activityCard}
        onPress={() => console.log('Open', item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.activityLeft}>
          <View style={[styles.iconCircle, { backgroundColor: '#efefefff' }]}>
            <ActivityIcon size={18} color="#000" strokeWidth={2.5} />
          </View>

          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activitySubtitle}>
              {item.date} • {item.duration} min
            </Text>
          </View>
        </View>

        <View style={styles.activityRight}>
          <Text style={styles.kcal}>{item.kcal}</Text>
          <Text style={styles.kcalUnit}>kcal</Text>
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
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.title}>Activité</Text>

            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              activeOpacity={0.9}
              style={styles.addButton}
            >
              <Plus color="#fff" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.periodCard}>
              <Text style={styles.periodNumber}>2</Text>
              <Text style={styles.periodLabel}>SEMAINE</Text>
            </View>
            <View style={[styles.periodCard, { marginLeft: 12 }]}>
              <Text style={styles.periodNumber}>2</Text>
              <Text style={styles.periodLabel}>MOIS</Text>
            </View>
          </View>

          <View style={styles.listContainer}>
            {activities.map(item => (
              <ActivityItem item={item} key={item.id} />
            ))}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)} />

          <View
            style={[
              styles.modalContainer,
              Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Bike size={20} color="#000" strokeWidth={2.5} />
              <Text style={styles.modalTitle}>Nouvelle Activité</Text>
            </View>

            <View style={styles.formRow}>
              <View style={styles.selectBox}>
                <TouchableOpacity
                  style={styles.selectInner}
                  onPress={() => {
                    const types = ['Marche', 'Vélo', 'Course'];
                    const idx = types.indexOf(activityType);
                    const next = types[(idx + 1) % types.length];
                    setActivityType(next);
                  }}
                >
                  <Text style={styles.selectLabel}> {activityType} </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formRow}>
              <TextInput
                keyboardType="numeric"
                style={styles.durationInput}
                value={duration}
                onChangeText={setDuration}
                placeholder="Durée (min)"
                placeholderTextColor="#bdbdbd"
              />
            </View>

            <View style={styles.estimationBox}>
              <Text style={styles.estimationHeading}>Estimation</Text>
              <Text style={styles.estimationSubtitle}>Calories approx.</Text>

              <View style={styles.estimationValueRow}>
                <Text style={styles.estimatedValue}>~{estimatedKcal}</Text>
                <Text style={styles.estimatedUnit}>kcal</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.addActivityButton} onPress={addActivity} activeOpacity={0.8}>
              <Text style={styles.addActivityText}>Ajouter</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary || '#333',
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
    shadowRadius: 18,
    elevation: 6,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  periodCard: {
    flex: 1,
    backgroundColor: '#ffffffff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  periodNumber: {
    fontSize: 24,
    color: '#000',
    fontWeight: '800',
  },
  periodLabel: {
    fontSize: 12,
    color: '#000',
    fontWeight: '700',
    marginTop: 6,
  },

  listContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  activityLeft: {
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
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary || '#333',
  },
  activitySubtitle: {
    fontSize: 13,
    color: colors.textSecondary || '#8E8E93',
    marginTop: 4,
  },
  activityRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  kcal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  kcalUnit: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },

  bottomPadding: {
    height: 100,
  },

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
    paddingHorizontal: 20,
    paddingTop: 12,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary || '#333',
    marginLeft: 6,
  },
  formRow: {
    marginBottom: 12,
  },
  selectBox: {
    backgroundColor: '#FAFAFB',
    borderRadius: 12,
    padding: 12,
  },
  selectInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectLabel: {
    fontSize: 16,
    color: colors.textPrimary || '#333',
    fontWeight: '600',
  },
  durationInput: {
    backgroundColor: '#FAFAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
    color: colors.textPrimary || '#333',
  },
  estimationBox: {
    backgroundColor: '#e8f1ffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  estimationHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  estimationSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  estimationValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimatedValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#007AFF',
  },
  estimatedUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  addActivityButton: {
    marginTop: 8,
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
  addActivityText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});