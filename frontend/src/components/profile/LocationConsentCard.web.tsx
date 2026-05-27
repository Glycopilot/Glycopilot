import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertTriangle, CheckCircle, MapPin } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export const LOCATION_PROCHE_KEY = '@glycopilot:location_proche_enabled';

export default function LocationConsentCard(): React.JSX.Element {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LOCATION_PROCHE_KEY).then(value => {
      setEnabled(value === 'true');
    });
  }, []);

  const toggle = (value: boolean) => {
    setEnabled(value);
    AsyncStorage.setItem(LOCATION_PROCHE_KEY, value ? 'true' : 'false');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, enabled && styles.iconBoxActive]}>
          <MapPin
            size={22}
            color={enabled ? '#007AFF' : '#9CA3AF'}
            strokeWidth={2}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Localisation d'urgence</Text>
          <View style={styles.statusRow}>
            {enabled ? (
              <CheckCircle size={12} color="#10B981" />
            ) : (
              <AlertTriangle size={12} color="#D97706" />
            )}
            <Text
              style={[
                styles.statusText,
                enabled ? styles.statusOn : styles.statusOff,
              ]}
            >
              {enabled ? 'Activée' : 'Désactivée'}
            </Text>
          </View>
        </View>
        <Switch
          trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
          thumbColor={enabled ? '#007AFF' : '#f4f3f4'}
          ios_backgroundColor="#D1D5DB"
          onValueChange={toggle}
          value={enabled}
        />
      </View>

      <Text style={styles.description}>
        Sur le web, la carte native n'est pas disponible. Le réglage reste
        testable, mais le rendu carte complet est réservé à l'APK.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: '#EBF5FF',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: { fontSize: 12 },
  statusOn: { color: '#10B981', fontWeight: '600' },
  statusOff: { color: '#D97706' },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
});
