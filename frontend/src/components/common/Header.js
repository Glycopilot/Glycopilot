import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Bell, User, LogOut } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import authService from '../../services/authService';
import useUser from '../../hooks/useUser';

export default function Header({ onNotificationPress, navigation }) {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { user, loading } = useUser();

  // Formater le nom d'affichage
  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      user.email ||
      'Utilisateur'
    : 'Utilisateur';

  const handleLogout = async () => {
    try {
      setDropdownVisible(false);
      await authService.logout();
      // Reset navigation to Login
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
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Glycopilot</Text>
      </View>

      {/* Right Section - Notification & Profile */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <Bell size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.profileContainer}>
          <TouchableOpacity
            onPress={() => setDropdownVisible(!dropdownVisible)}
            activeOpacity={0.7}
          >
            <Image
              source={
                user?.profile_image
                  ? { uri: user.profile_image }
                  : require('../../../assets/default-avatar.png')
              }
              style={styles.profileImage}
            />
          </TouchableOpacity>

          {/* Dropdown Menu */}
          {dropdownVisible && (
            <View style={styles.dropdownMenu}>
              <View style={styles.dropdownHeader}>
                <Image
                  source={require('../../../assets/default-avatar.png')}
                  style={styles.dropdownProfileImage}
                />
                <Text style={styles.dropdownUserName}>{displayName}</Text>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleProfilePress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  <User size={18} color="#007AFF" strokeWidth={2} />
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

      {/* Overlay invisible pour fermer le dropdown */}
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
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 19,
  },
  // Dropdown Styles
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dropdownProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  dropdownUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary || '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    backgroundColor: '#FFE5E5',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary || '#000000',
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
