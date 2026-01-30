import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import useUser from '../../hooks/useUser';

interface BannerProps {
  date?: string;
}

export default function Banner({ date }: BannerProps) {
  const { user } = useUser();

  const displayName = user
    ? `${user.firstName || ''}`.trim() || 'Utilisateur'
    : 'Utilisateur';

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) {
      const today = new Date();
      const day = today.getDate();
      const month = today.toLocaleDateString('fr-FR', { month: 'long' });
      const year = today.getFullYear();
      return `${day} ${month} ${year}`;
    }
    return dateStr;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>Bonjour {displayName} !</Text>
        <Text style={styles.question}>Comment allez vous aujourd'hui ?</Text>
      </View>

      <View style={styles.dateContainer}>
        <Calendar size={18} color="#0073ff" strokeWidth={2.5} />
        <Text style={styles.dateText}>{formatDate(date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    position: 'relative',
  },
  content: {
    marginBottom: 8,
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
    marginBottom: 4,
    opacity: 0.9,
  },
  question: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 30,
  },
  dateContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.95,
  },
});
