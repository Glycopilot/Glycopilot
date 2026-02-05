import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Bell, User as UserIcon, LogOut } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import authService from '../../services/authService';
import useUser from '../../hooks/useUser';

interface HeaderProps {
  onNotificationPress?: () => void;
  navigation: any;
}

export default function Header({
  onNotificationPress,
  navigation,
}: HeaderProps) {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { user } = useUser();

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      user.email ||
      'Utilisateur'
    : 'Utilisateur';

  const handleLogout = async () => {
    try {
      setDropdownVisible(false);
      await authService.logout();
      if (navigation && navigation.reset) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
      console.warn('Logout error', err);
    }
  };

  const handleProfilePress = () => {
    setDropdownVisible(false);
    if (navigation && navigation.navigate) {
      navigation.navigate('Profile');
    }
  };

  const handleNotificationPress = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate('Notifications');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Glycopilot</Text>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onNotificationPress || handleNotificationPress}
          activeOpacity={0.7}
        >
          <Bell size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.profileContainer}>
          <TouchableOpacity
            onPress={() => setDropdownVisible(!dropdownVisible)}
            activeOpacity={0.7}
          >
            <View style={styles.profileImage}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>

          {dropdownVisible && (
            <View style={styles.dropdownMenu}>
              <View style={styles.dropdownHeader}>
                <View style={styles.dropdownProfileImage}>
                  <Text style={styles.dropdownAvatarText}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.dropdownUserName}>{displayName}</Text>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleProfilePress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  <UserIcon size={18} color="#007AFF" strokeWidth={2} />
                </View>
                <Text style={styles.dropdownItemText}>Profil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, styles.logoutIcon]}>
                  <LogOut size={18} color="#FF3B30" strokeWidth={2} />
                </View>
                <Text style={[styles.dropdownItemText, styles.logoutText]}>
                  Déconnexion
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {dropdownVisible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dropdownProfileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dropdownUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E5F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    backgroundColor: '#FFEBEE',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  logoutText: {
    color: '#FF3B30',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});
