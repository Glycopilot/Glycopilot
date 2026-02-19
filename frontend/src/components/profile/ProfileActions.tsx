import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2, LogOut } from 'lucide-react-native';

interface ProfileActionsProps {
  readonly onEditProfile: () => void;
  readonly onLogout: () => void;
}

export default function ProfileActions({
  onEditProfile,
  onLogout,
}: ProfileActionsProps): React.JSX.Element {
  return (
    <View style={styles.actionsSection}>
      <TouchableOpacity
        style={styles.editProfileButton}
        onPress={onEditProfile}
      >
        <Edit2 size={18} color="#007AFF" />
        <Text style={styles.editProfileText}>Modifier le profil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <LogOut size={18} color="#EF4444" />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsSection: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EBF5FF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  editProfileText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
});
