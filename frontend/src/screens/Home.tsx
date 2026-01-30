import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LayoutGrid, Bell } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import Banner from '../components/dashboard/Banner';
import GlycemieCard from '../components/dashboard/GlycemieCard';
import StatCard from '../components/dashboard/StatCard';
import ActionButton from '../components/common/ActionButton';
import useDashboard from '../hooks/useDashboard';
import { Activity, Pill } from 'lucide-react-native';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { glucose, medication, activity, refreshing, refresh } = useDashboard({
    modules: ['glucose', 'alerts', 'medication', 'nutrition', 'activity'],
    refreshInterval: 30000,
    autoLoad: true,
  });

  const getGlycemieStatus = (value: number) => {
    if (value < 70 || value > 180) return 'danger';
    if (value < 80 || value > 160) return 'warning';
    return 'normal';
  };

  return (
    <Layout
      navigation={navigation}
      currentRoute="Home"
      onNotificationPress={() => console.log('Notifications')}
    >
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#FF9F1C"
          />
        }
      >
        <Banner />

        <View style={styles.sectionHeader}>
          <LayoutGrid size={20} color="#8E8E93" strokeWidth={2.5} />
          <Text style={styles.sectionTitle}>Dashboard</Text>
        </View>

        <GlycemieCard
          value={glucose?.value || 125}
          status={getGlycemieStatus(glucose?.value || 125)}
          timestamp={glucose?.recordedAt || new Date().toISOString()}
          onPress={() => navigation.navigate('Stats')}
        />

        <View style={styles.statsRow}>
          {activity && (
            <StatCard
              title="Activité"
              icon={Activity}
              iconColor="#FF9F1C"
              iconBgColor="#FFF9F0"
              value={activity.today_count || 0}
              subtitle="Activités aujourd'hui"
              onPress={() => console.log('Navigate to Activity')}
            />
          )}
          {medication && (
            <StatCard
              title="Médic"
              icon={Pill}
              iconColor="#AF52DE"
              iconBgColor="#F5EBFF"
              value={medication.taken_count || 0}
              secondaryValue={medication.total_count || 0}
              subtitle="Prises"
              onPress={() => console.log('Navigate to Medications')}
            />
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Bell size={20} color="#8E8E93" strokeWidth={2.5} />
          <Text style={styles.sectionTitle}>Actions rapides</Text>
        </View>

        <View style={styles.actionsRow}>
          <ActionButton
            type="glycemie"
            label="Glycémie"
            onPress={() => {
              if (navigation && navigation.navigate) {
                navigation.navigate('Glycemia');
              }
            }}
          />
          <ActionButton
            type="repas"
            label="Repas"
            onPress={() => {
              if (navigation && navigation.navigate) {
                navigation.navigate('Repas');
              }
            }}
          />
          <ActionButton
            type="medic"
            label="Médic"
            onPress={() => {
              if (navigation && navigation.navigate) {
                navigation.navigate('Traitements');
              }
            }}
          />
          <ActionButton
            type="action"
            label="Activité"
            onPress={() => {
              if (navigation && navigation.navigate) {
                navigation.navigate('Activite');
              }
            }}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 4,
  },
  bottomPadding: {
    height: 100,
  },
});
