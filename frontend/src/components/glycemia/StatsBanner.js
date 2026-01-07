import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export default function StatsBanner({ displayName }) {
  const formatDate = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleDateString('fr-FR', { month: 'long' });
    const year = today.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <Text style={styles.greeting}>
          Bonjour {displayName.split(' ')[0]} !
        </Text>
        <Text style={styles.bannerTitle}>
          Voici votre récapitulatif du mois
        </Text>
      </View>
      <View style={styles.dateContainer}>
        <Calendar size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.dateText}>{formatDate()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.secondary || '#FF9F1C',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  bannerContent: {
    marginBottom: 12,
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
    marginBottom: 4,
    opacity: 0.9,
  },
  bannerTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 30,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.95,
  },
});
