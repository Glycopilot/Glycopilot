import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export default function MeasuresList({ measures }) {
  const getGlycemiaColor = value => {
    if (value < 70) return '#E74C3C';
    if (value > 180) return '#E67E22';
    return '#27AE60';
  };

  const formatDateTime = dateString => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    const time = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) {
      return `Aujourd'hui à ${time}`;
    }

    const dateStr = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
    return `${dateStr} à ${time}`;
  };

  return (
    <View style={styles.recentSection}>
      <Text style={styles.sectionTitle}>Dernières mesures</Text>

      {measures.length === 0 ? (
        <View style={styles.emptyState}>
          <Activity size={48} color="#E0E0E0" strokeWidth={2} />
          <Text style={styles.emptyText}>Aucune mesure enregistrée</Text>
          <Text style={styles.emptySubtext}>
            Commencez à enregistrer vos glycémies
          </Text>
        </View>
      ) : (
        measures.map((measure, index) => (
          <View key={measure.id || index} style={styles.measureCard}>
            <View style={styles.measureLeft}>
              <View
                style={[
                  styles.measureIndicator,
                  { backgroundColor: getGlycemiaColor(measure.value) },
                ]}
              />
              <View style={styles.measureInfo}>
                <Text style={styles.measureValue}>{measure.value} mg/dL</Text>
                <Text style={styles.measureTime}>
                  {formatDateTime(measure.measured_at)}
                </Text>
              </View>
            </View>

            {measure.context && (
              <View style={styles.contextBadge}>
                <Text style={styles.contextText}>{measure.context}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recentSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
    marginBottom: 12,
  },
  measureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  measureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  measureIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  measureInfo: {
    flex: 1,
  },
  measureValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
    marginBottom: 4,
  },
  measureTime: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  contextBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary || '#000000',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
