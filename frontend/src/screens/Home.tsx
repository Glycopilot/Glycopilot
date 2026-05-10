import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useMedications } from '../hooks/useMedications';
import { Activity, Pill } from 'lucide-react-native';
import {
  GLYCEMIA_TARGET,
  getGlycemiaStatus,
} from '../constants/glycemia.constants';
import { useGlycemiaWebSocket } from '../hooks/useGlycemiaWebSocket';
import glycemiaService from '../services/glycemiaService';
import type { GlycemiaEntry } from '../types/glycemia.types';
import { toastError, toastInfo } from '../services/toastService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications } from '../services/pushService';
import { WS_URL } from '../services/apiClient';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { glucose, activity, healthScore, refreshing, refresh } =
    useDashboard({
      modules: ['glucose', 'alerts', 'nutrition', 'activity'],
      refreshInterval: 30000,
      autoLoad: true,
    });

  const { todayIntakes } = useMedications();

  // Calcul identique à medicins.tsx
  const medicationSummary = useMemo(() => {
    const taken_count = todayIntakes.filter(i => i.status === 'taken').length;
    const total_count = todayIntakes.length;
    const nowTime = new Date().toTimeString().slice(0, 5);
    const pending = todayIntakes.filter(i => i.status === 'pending');
    const nextIntake =
      pending.find(i => i.scheduled_time >= nowTime) ?? pending[0] ?? null;

    return {
      taken_count,
      total_count,
      nextDose: nextIntake
        ? {
            name: nextIntake.medication_name ?? '',
            scheduledAt: `${nextIntake.scheduled_date}T${nextIntake.scheduled_time}`,
            status: nextIntake.status,
          }
        : null,
    };
  }, [todayIntakes]);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [wsEnabled, setWsEnabled] = useState(false);
  const [currentGlucoseEntry, setCurrentGlucoseEntry] = useState<GlycemiaEntry | null>(null);

  const fetchCurrentGlucose = useCallback(async () => {
    const entry = await glycemiaService.getCurrent();
    if (entry) setCurrentGlucoseEntry(entry);
  }, []);

  // Fetch initial + enregistrement push
  useEffect(() => {
    fetchCurrentGlucose();
    AsyncStorage.getItem('access_token').then(token => {
      if (token) {
        setAccessToken(token);
        setWsEnabled(true);
        registerForPushNotifications();
      }
    });
  }, [fetchCurrentGlucose]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), fetchCurrentGlucose()]);
  }, [refresh, fetchCurrentGlucose]);

  // WebSocket pour les mises à jour temps réel (only connect when token is available)
  const { lastReading, alert } = useGlycemiaWebSocket(
    wsEnabled ? accessToken : null,
    WS_URL
  );

  // Priorité : WebSocket > glycemia/current (direct DB) > dashboard summary
  const realtimeGlucose = useMemo(() => {
    const wsTs = lastReading?.measured_at ? new Date(lastReading.measured_at).getTime() : 0;
    const directTs = currentGlucoseEntry?.measured_at ? new Date(currentGlucoseEntry.measured_at).getTime() : 0;
    const dashTs = glucose?.recordedAt ? new Date(glucose.recordedAt).getTime() : 0;

    if (lastReading && wsTs >= Math.max(directTs, dashTs)) {
      return {
        value: lastReading.value,
        unit: lastReading.unit || 'mg/dL',
        trend: lastReading.trend,
        recordedAt: lastReading.measured_at,
      };
    }
    if (currentGlucoseEntry && directTs >= dashTs) {
      return {
        value: currentGlucoseEntry.value,
        unit: currentGlucoseEntry.unit || 'mg/dL',
        trend: currentGlucoseEntry.trend,
        recordedAt: currentGlucoseEntry.measured_at,
      };
    }
    return glucose ?? null;
  }, [lastReading, currentGlucoseEntry, glucose]);

  // Afficher une alerte si reçue du WebSocket
  useEffect(() => {
    if (alert) {
      const value = alert.data.value;
      const unit = alert.data.unit || 'mg/dL';
      const status = getGlycemiaStatus(value);

      if (status === 'hypo') {
        toastError('Hypoglycémie', `Glycémie: ${value} ${unit}`);
      } else if (status === 'hyper') {
        toastInfo('Hyperglycémie', `Glycémie: ${value} ${unit}`);
      }
    }
  }, [alert]);

  const getGlycemieStatus = (value: number): 'normal' | 'low' | 'high' => {
    if (value < GLYCEMIA_TARGET.MIN) return 'low'; // Hypo < 70
    if (value > GLYCEMIA_TARGET.MAX) return 'high'; // Hyper > 180
    return 'normal'; // Entre 70-180
  };

  return (
    <Layout navigation={navigation} currentRoute="Home">
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF9F1C"
          />
        }
      >
        <Banner
          healthScore={healthScore}
          glucoseTrend={realtimeGlucose?.trend}
          glucoseValue={realtimeGlucose?.value}
          medication={medicationSummary}
        />

        <View style={styles.sectionHeader}>
          <LayoutGrid size={20} color="#8E8E93" strokeWidth={2.5} />
          <Text style={styles.sectionTitle}>Dashboard</Text>
        </View>

        <GlycemieCard
          value={realtimeGlucose?.value ?? null}
          status={realtimeGlucose ? getGlycemieStatus(realtimeGlucose.value) : undefined}
          timestamp={realtimeGlucose?.recordedAt}
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
          <StatCard
            title="Médicaments"
            icon={Pill}
            iconColor="#AF52DE"
            iconBgColor="#F5EBFF"
            value={medicationSummary.taken_count}
            secondaryValue={medicationSummary.total_count}
            subtitle="Prises aujourd'hui"
            onPress={() => navigation.navigate('Traitements')}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Bell size={20} color="#8E8E93" strokeWidth={2.5} />
          <Text style={styles.sectionTitle}>Actions rapides</Text>
        </View>

        <View style={styles.sensorRow}>
          <ActionButton
            type="glycemie"
            label="Mon capteur"
            onPress={() => {
              if (navigation && navigation.navigate) {
                navigation.navigate('SensorActivation');
              }
            }}
          />
        </View>

        <View style={styles.actionsRow}>
          <ActionButton
            type="repas"
            label="Repas"
            onPress={() => navigation?.navigate('Repas')}
          />
          <ActionButton
            type="medic"
            label="Médic"
            onPress={() => navigation?.navigate('Traitements')}
          />
          <ActionButton
            type="action"
            label="Activité"
            onPress={() => navigation?.navigate('Activite')}
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
  sensorRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  bottomPadding: {
    height: 100,
  },
});
