import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';
import { useLibre2Sensor } from '../hooks/useLibre2Sensor';

type Props = {
  navigation: { navigate: (screen: string) => void };
};

export default function SensorActivationScreen({ navigation }: Props) {
  const sensor = useLibre2Sensor();

  const onActivate = async () => {
    try {
      await sensor.activate();
    } catch (e: any) {
      Alert.alert('Activation échouée', e?.message ?? 'Erreur inconnue');
    }
  };

  const onStart = async () => {
    try {
      await sensor.startStreaming();
    } catch (e: any) {
      Alert.alert('Connexion BLE impossible', e?.message ?? 'Erreur inconnue');
    }
  };

  const onForget = () => {
    Alert.alert(
      'Oublier le capteur',
      'Tu devras refaire le scan NFC pour ré-activer un capteur. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oublier',
          style: 'destructive',
          onPress: () => sensor.forget(),
        },
      ]
    );
  };

  return (
    <Layout navigation={navigation}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Capteur Libre 2</Text>
        <Text style={styles.subtitle}>
          Approche ton téléphone du patch pour activer le capteur, puis démarre
          la surveillance temps réel.
        </Text>

        <StatusCard status={sensor.status} bleState={sensor.bleState} />

        {sensor.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{sensor.error}</Text>
          </View>
        )}

        {!sensor.sensor && (
          <Pressable
            style={[styles.primaryButton, sensor.status === 'ACTIVATING' && styles.disabled]}
            onPress={onActivate}
            disabled={sensor.status === 'ACTIVATING'}>
            {sensor.status === 'ACTIVATING' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Scanner le capteur (NFC)</Text>
            )}
          </Pressable>
        )}

        {sensor.sensor && (
          <View style={styles.sensorBlock}>
            <Field label="Numéro de série" value={sensor.sensor.serial} />
            <Field label="Adresse BLE" value={sensor.sensor.mac} />
            <Field
              label="Compteur unlock"
              value={String(sensor.sensor.unlockCount)}
            />
            {sensor.current && sensor.current.mgdl != null && (
              <View style={styles.liveBox}>
                <Text style={styles.liveLabel}>Glycémie en direct</Text>
                <Text style={styles.liveValue}>
                  {Math.round(sensor.current.mgdl)} mg/dL
                </Text>
                <Text style={styles.liveTimestamp}>
                  Reçue à {sensor.current.measuredAt.toLocaleTimeString()}
                </Text>
              </View>
            )}

            {sensor.status === 'STREAMING' || sensor.status === 'CONNECTING' ? (
              <Pressable
                style={[styles.secondaryButton]}
                onPress={() => sensor.stopStreaming()}>
                <Text style={styles.secondaryButtonText}>Arrêter la surveillance</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} onPress={onStart}>
                <Text style={styles.primaryButtonText}>Démarrer la surveillance</Text>
              </Pressable>
            )}

            <Pressable style={styles.dangerButton} onPress={onForget}>
              <Text style={styles.dangerButtonText}>Oublier ce capteur</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}

function StatusCard({
  status,
  bleState,
}: {
  status: ReturnType<typeof useLibre2Sensor>['status'];
  bleState: ReturnType<typeof useLibre2Sensor>['bleState'];
}) {
  const label = (() => {
    switch (status) {
      case 'IDLE':
        return 'Aucun capteur activé';
      case 'ACTIVATING':
        return 'Approche le téléphone du patch...';
      case 'ACTIVATED':
        return 'Capteur activé, prêt à streamer';
      case 'CONNECTING':
        return `Connexion BLE en cours${bleState ? ` (${bleState})` : ''}`;
      case 'STREAMING':
        return 'Streaming en cours — données toutes les 60 secondes';
      case 'ERROR':
        return 'Erreur';
    }
  })();
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 80 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20 },
  statusCard: {
    backgroundColor: colors.lightBg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusLabel: { color: colors.textPrimary, fontSize: 14 },
  errorBox: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: '#900', fontSize: 13 },
  sensorBlock: { marginTop: 8 },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: colors.lightBg,
    borderBottomWidth: 1,
  },
  fieldLabel: { color: colors.textSecondary, fontSize: 13 },
  fieldValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  liveBox: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  liveLabel: { color: '#fff', fontSize: 12, opacity: 0.85 },
  liveValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
    marginVertical: 6,
  },
  liveTimestamp: { color: '#fff', fontSize: 11, opacity: 0.85 },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: { color: '#fff', fontSize: 14 },
  dangerButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  dangerButtonText: { color: '#900', fontSize: 13 },
  disabled: { opacity: 0.6 },
});
