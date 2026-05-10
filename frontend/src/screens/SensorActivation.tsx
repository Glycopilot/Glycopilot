import React from 'react';
import {
  Alert,
  Linking,
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

const JUGGLUCO_INSTALL_URL = 'https://www.juggluco.nl/Juggluco/';

export default function SensorActivationScreen({ navigation }: Props) {
  const sensor = useLibre2Sensor();

  const onStart = async () => {
    try {
      const installed = await sensor.start();
      if (!installed) {
        Alert.alert(
          'Juggluco non installé',
          'Glycopilot a besoin de l\'application Juggluco pour communiquer avec le capteur Libre 2+. Voulez-vous l\'ouvrir maintenant ?',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Installer', onPress: () => Linking.openURL(JUGGLUCO_INSTALL_URL) },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de démarrer la surveillance');
    }
  };

  return (
    <Layout navigation={navigation}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Surveillance temps réel</Text>
        <Text style={styles.subtitle}>
          Glycopilot reçoit les valeurs du capteur Libre 2+ via l'app Juggluco
          tournant en arrière-plan. Configurez Juggluco et LibreLink une fois,
          puis ouvrez la surveillance ci-dessous.
        </Text>

        <StatusCard status={sensor.status} />

        {sensor.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{sensor.error}</Text>
          </View>
        )}

        {sensor.current && (
          <View style={styles.liveBox}>
            <Text style={styles.liveLabel}>Glycémie en direct</Text>
            <Text style={styles.liveValue}>{sensor.current.mgdl} mg/dL</Text>
            <Text style={styles.liveTimestamp}>
              Capteur {sensor.current.serial || '—'} · reçu à{' '}
              {sensor.current.measuredAt.toLocaleTimeString()}
            </Text>
          </View>
        )}

        {sensor.status === 'IDLE' || sensor.status === 'NO_JUGGLUCO' || sensor.status === 'ERROR' ? (
          <Pressable style={styles.primaryButton} onPress={onStart}>
            <Text style={styles.primaryButtonText}>Activer la surveillance</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={() => sensor.stop()}>
            <Text style={styles.secondaryButtonText}>Arrêter la surveillance</Text>
          </Pressable>
        )}

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>Première fois ?</Text>
          <Text style={styles.helpText}>
            Suivez le guide de setup pour installer LibreLink, Juggluco, poser
            votre capteur Libre 2+ et l'activer. Vous n'avez à le faire qu'une
            fois (puis tous les 14 jours pour un nouveau capteur).
          </Text>
        </View>
      </ScrollView>
    </Layout>
  );
}

function StatusCard({
  status,
}: {
  status: ReturnType<typeof useLibre2Sensor>['status'];
}) {
  const label = (() => {
    switch (status) {
      case 'IDLE':
        return 'Surveillance non démarrée';
      case 'NO_JUGGLUCO':
        return 'Juggluco non installée — installer l\'app pour continuer';
      case 'WAITING':
        return 'En attente d\'une mesure de Juggluco...';
      case 'STREAMING':
        return 'Mesures reçues en direct';
      case 'ERROR':
        return 'Erreur — voir le détail ci-dessous';
    }
  })();
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 80 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
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
  liveBox: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
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
  helpBox: {
    backgroundColor: colors.lightBg,
    padding: 14,
    borderRadius: 10,
    marginTop: 24,
  },
  helpTitle: { fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  helpText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
