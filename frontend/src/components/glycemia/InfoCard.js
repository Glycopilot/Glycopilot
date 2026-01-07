import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export default function InfoCard({ stats }) {
  if (!stats) return null;

  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Zap size={18} color="#2196F3" strokeWidth={2.5} />
        <Text style={styles.infoTitle}>Comprendre vos statistiques</Text>
      </View>
      <View style={styles.infoItem}>
        <View style={styles.infoDot} />
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Temps dans la cible :</Text> L'objectif
          est de rester au moins 70% du temps entre 70-180 mg/dL
        </Text>
      </View>
      <View style={styles.infoItem}>
        <View style={styles.infoDot} />
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Variabilité :</Text> Un écart-type ≤ 36
          mg/dL indique une glycémie stable
        </Text>
      </View>
      <View style={styles.infoItem}>
        <View style={styles.infoDot} />
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Tendance :</Text> Compare vos 15
          premiers jours aux 15 derniers pour détecter les évolutions
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 8,
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9F1C',
    marginRight: 10,
    marginTop: 7,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
  },
});
