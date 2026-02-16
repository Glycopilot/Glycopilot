import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2 } from 'lucide-react-native';
import type { User } from '../../types/auth.types';

interface IncompleteProfileBannerProps {
  readonly user: User | null;
  readonly onPress: () => void;
}

export default function IncompleteProfileBanner({
  user,
  onPress,
}: IncompleteProfileBannerProps): React.JSX.Element | null {
  const isIncomplete =
    !user?.firstName ||
    !user?.lastName ||
    !user?.phoneNumber ||
    !user?.address ||
    !user?.diabetesType;

  if (!isIncomplete) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Edit2 size={20} color="#F59E0B" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Profil incomplet</Text>
          <Text style={styles.text}>
            Complétez votre profil pour une meilleure expérience.{' '}
            {user?.firstName && user?.lastName ? '' : 'Nom manquant. '}
            {user?.phoneNumber ? '' : 'Téléphone manquant. '}
            {user?.address ? '' : 'Adresse manquante. '}
            {user?.diabetesType ? '' : 'Type de diabète manquant.'}
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>Compléter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: -10,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
