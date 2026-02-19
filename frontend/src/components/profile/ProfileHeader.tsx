import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import type { User as UserType } from '../../types/auth.types';

interface ProfileHeaderProps {
  user: UserType | null;
}

export default function ProfileHeader({
  user,
}: ProfileHeaderProps): React.JSX.Element {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatarCircle}>
        <User size={40} color="#fff" strokeWidth={2} />
      </View>
      <Text style={styles.userName}>
        {user?.firstName || ''} {user?.lastName || ''}
      </Text>
      <Text style={styles.userEmail}>{user?.email || ''}</Text>
      <View style={styles.diabetesInfo}>
        {user?.diabetesType && (
          <View style={styles.diabetesBadge}>
            <Text style={styles.diabetesText}>{user.diabetesType}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    backgroundColor: colors.secondary,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#B3D9FF',
    marginBottom: 12,
  },
  diabetesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  diabetesBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  diabetesText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
