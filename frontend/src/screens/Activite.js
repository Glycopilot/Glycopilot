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
import SelectList from '../components/common/SelectList';
import IndicatorCard from '../components/common/IndicatorCard';
import { colors } from '../themes/colors';
import { loadActivities } from '../data/sources';

export default function ActiviteScreen({ navigation }) {
  const initialData = [
    {
      id: '1',
      title: 'Marche',
      date: new Date().toLocaleDateString('fr-FR'),
      duration: 30,
      kcal: 4.3 * 30,
    },
  ];

  const [activities, setActivities] = useState(initialData);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activityType, setActivityType] = useState('Marche');
  const [duration, setDuration] = useState('30');

  const [activityOptions, setActivityOptions] = useState([]);

  React.useEffect(() => {
    let mounted = true;
    loadActivities().then(list => {
      if (!mounted) return;
      setActivityOptions(list);
      if (list && list.length) setActivityType(list[0].name);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const calorieMap = useMemo(() => {
    return (activityOptions || []).reduce((m, a) => ({ ...m, [a.name]: a.caloriesPerMin }), {});
  }, [activityOptions]);
  const estimatedKcal = useMemo(() => {
    const d = parseInt(duration || '0', 10) || 0;
    const kcalPerMin = calorieMap[activityType] || (activityOptions[0] && activityOptions[0].caloriesPerMin) || 4.3;
    return Math.round(kcalPerMin * d);
  }, [activityType, duration, calorieMap, activityOptions]);

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
    setActivityType((activityOptions && activityOptions[0] && activityOptions[0].name) || 'Marche');

    // if this activity is new, add to suggestions and persist
    if (!activityOptions.find(a => a.name === newActivity.title)) {
      const suggestion = { id: `act-sugg-${Date.now()}`, name: newActivity.title, caloriesPerMin: Math.round((newActivity.kcal / Math.max(1, newActivity.duration)) * 10) / 10 };
      const updated = [suggestion, ...(activityOptions || [])];
      setActivityOptions(updated);
      import('../data/storage').then(m => m.storage.setActivities(updated)).catch(() => {});
    }
  }

  const ActivityItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.activityCard}
        onPress={() => console.log('Open', item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.activityLeft}>
          <View style={styles.iconCircle}>
            <ActivityIcon size={20} color="#007AFF" strokeWidth={2.5} />
          </View>

          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle} numberOfLines={1} ellipsizeMode={'tail'}>{item.title}</Text>
            <Text style={styles.activitySubtitle} numberOfLines={1} ellipsizeMode={'tail'}>
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
      <View style={styles.container}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.title}>Activité</Text>

            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              activeOpacity={0.9}
              style={styles.addButton}
            >
              <Plus color="#fff" size={22} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Activity indicators (computed) */}
          <View style={styles.statsRow}> 
            <IndicatorCard title="Sessions (7j)" value={(() => {
              try {
                const parseFR = s => {
                  if (!s) return null;
                  if (s.includes('-')) return new Date(s);
                  const parts = s.split('/');
                  if (parts.length === 3) return new Date(parts[2], parseInt(parts[1],10)-1, parts[0]);
                  return new Date(s);
                };
                const now = new Date();
                const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate()-6);
                return activities.filter(a => {
                  const d = parseFR(a.date);
                  return d && d >= weekAgo;
                }).length;
              } catch (e) { return '—'; }
            })()} subtitle={(() => {
              const kcalWeek = (() => {
                try {
                  const parseFR = s => {
                    if (!s) return null;
                    if (s.includes('-')) return new Date(s);
                    const parts = s.split('/');
                    if (parts.length === 3) return new Date(parts[2], parseInt(parts[1],10)-1, parts[0]);
                    return new Date(s);
                  };
                  const now = new Date();
                  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate()-6);
                  return (activities || []).filter(a => { const d = parseFR(a.date); return d && d >= weekAgo; }).reduce((s,a)=> s + (a.kcal || 0), 0);
                } catch (e) { return 0; }
              })();
              return `~${kcalWeek} kcal (7j)`;
            })()} />

            <IndicatorCard title="Sessions (30j)" value={(() => {
              try {
                const parseFR = s => {
                  if (!s) return null;
                  if (s.includes('-')) return new Date(s);
                  const parts = s.split('/');
                  if (parts.length === 3) return new Date(parts[2], parseInt(parts[1],10)-1, parts[0]);
                  return new Date(s);
                };
                const now = new Date();
                const monthAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate()-29);
                return activities.filter(a => { const d = parseFR(a.date); return d && d >= monthAgo; }).length;
              } catch (e) { return '—'; }
            })()} style={{ marginLeft: 12 }} />
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
              <View style={styles.modalIconCircle}>
                <Bike size={22} color="#007AFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.modalTitle}>Nouvelle Activité</Text>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.formRow}>
                <SelectList
                  options={activityOptions}
                  value={activityType}
                  onValueChange={setActivityType}
                  placeholder="Sélectionner une activité"
                  renderItemLabel={a => `${a.name} (${a.caloriesPerMin} kcal/min)`}
                />
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
                <Text style={styles.estimationSubtitle}>Calories approximatives</Text>

                <View style={styles.estimationValueRow}>
                  <Text style={styles.estimatedValue}>~{estimatedKcal}</Text>
                  <Text style={styles.estimatedUnit}>kcal</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.addActivityButton} onPress={addActivity} activeOpacity={0.8}>
                <Text style={styles.addActivityText}>Ajouter</Text>
              </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary || '#333',
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

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  activityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary || '#333',
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    color: colors.textSecondary || '#8E8E93',
    fontWeight: '400',
  },
  activityRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  kcal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 2,
  },
  kcalUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
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
    color: colors.textPrimary || '#333',
    letterSpacing: -0.3,
  },
  formRow: {
    marginBottom: 16,
  },
  durationInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary || '#333',
  },
  estimationBox: {
    backgroundColor: '#F0F7FF',
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
    marginBottom: 20,
  },
  estimationHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  estimationSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 14,
    fontWeight: '400',
  },
  estimationValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  estimatedValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: -0.5,
  },
  estimatedUnit: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  addActivityButton: {
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
  },
  addActivityText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});