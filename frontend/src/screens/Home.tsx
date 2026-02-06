import React, { useState, useEffect } from 'react';
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
import { GLYCEMIA_TARGET } from '../constants/glycemia.constants';
import { useGlycemiaWebSocket } from '../hooks/useGlycemiaWebSocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications } from '../services/pushService';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { glucose, medication, activity, healthScore, refreshing, refresh } =
    useDashboard({
      modules: ['glucose', 'alerts', 'medication', 'nutrition', 'activity'],
      refreshInterval: 30000,
      autoLoad: true,
    });

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [realtimeGlucose, setRealtimeGlucose] = useState(glucose);
  const [wsEnabled, setWsEnabled] = useState(false);

  // Récupérer le token JWT et enregistrer les notifications push
  useEffect(() => {
    AsyncStorage.getItem('access_token').then(token => {
      if (token) {
        setAccessToken(token);
        setWsEnabled(true); // Enable WebSocket only after token is loaded
        // Enregistrer pour les notifications push
        registerForPushNotifications();
      }
    });
  }, []);

  // WebSocket pour les mises à jour temps réel (only connect when token is available)
  const { lastReading, alert } = useGlycemiaWebSocket(
    wsEnabled ? accessToken : null,
    process.env.EXPO_PUBLIC_WS_URL ?? ''
  );

  // Mettre à jour la glycémie avec les données WebSocket
  useEffect(() => {
    if (lastReading) {
      setRealtimeGlucose({
        value: lastReading.value,
        unit: lastReading.unit || 'mg/dL',
        trend: lastReading.trend as 'rising' | 'falling' | 'flat' | undefined,
        recordedAt: lastReading.measured_at,
      });
    } else if (glucose) {
      setRealtimeGlucose(glucose);
    }
  }, [lastReading, glucose]);

  // Afficher une alerte si reçue du WebSocket
  useEffect(() => {
    if (alert) {
      // Vous pouvez afficher une notification ou une alerte ici
      console.warn(
        `Alert: ${alert.type} - ${alert.data.value} ${alert.data.unit}`
      );
    }
  }, [alert]);

  const getGlycemieStatus = (value: number): 'normal' | 'low' | 'high' => {
    if (value < GLYCEMIA_TARGET.MIN) return 'low'; // Hypo < 70
    if (value > GLYCEMIA_TARGET.MAX) return 'high'; // Hyper > 180
    return 'normal'; // Entre 70-180
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
        <Banner
          healthScore={healthScore}
          glucoseTrend={realtimeGlucose?.trend}
          glucoseValue={realtimeGlucose?.value}
          medication={medication}
        />

        <View style={styles.sectionHeader}>
          <LayoutGrid size={20} color="#8E8E93" strokeWidth={2.5} />
          <Text style={styles.sectionTitle}>Dashboard</Text>
        </View>

        <GlycemieCard
          value={realtimeGlucose?.value || 125}
          status={getGlycemieStatus(realtimeGlucose?.value || 125)}
          timestamp={realtimeGlucose?.recordedAt || new Date().toISOString()}
          unit={realtimeGlucose?.unit}
          trend={realtimeGlucose?.trend}
          onPress={() => navigation.navigate('Stats')}
        />

        <View style={styles.statsRow}>
          {activity && (
            <StatCard
              title="Activité"
              icon={Activity}
              iconColor="#FF9F1C"
              iconBgColor="#FFF9F0"
              value={activity.steps?.value || 0}
              subtitle={`/ ${activity.steps?.goal || 8000} pas`}
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
              subtitle="Prises aujourd'hui"
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
