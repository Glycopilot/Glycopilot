import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  AlertCircle,
  Edit3,
  LogOut,
  Settings,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import useUser from '../hooks/useUser';
import authService from '../services/authService';
import { colors } from '../themes/colors';

export default function ProfileScreen({ navigation }) {
  const { user, loading, refetch } = useUser();
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  const formatDate = dateString => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getMissingFields = () => {
    const missing = [];
    if (!user?.phone_number) missing.push('Numéro de téléphone');
    if (!user?.address) missing.push('Adresse');
    if (!user?.birth_date) missing.push('Date de naissance');
    if (!user?.medical_comment) missing.push('Commentaires médicaux');
    return missing;
  };

  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      user.email ||
      'Utilisateur'
    : 'Utilisateur';

  if (loading) {
    return (
      <Layout
        navigation={navigation}
        currentRoute="Profile"
        userName="Utilisateur"
        onNotificationPress={() => console.log('Notifications')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9F1C" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </Layout>
    );
  }

  const missingFields = getMissingFields();

  return (
    <Layout
      navigation={navigation}
      currentRoute="Profile"
      userName={displayName}
      onNotificationPress={() => console.log('Notifications')}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF9F1C"
          />
        }
      >
        {/* Header avec avatar */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.first_name?.[0] || user?.email?.[0] || 'U'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userDiabetesType}>
            {' '}
            type de diabète: {user?.diabetes_type || 'Non renseigné'}
          </Text>
        </View>

        {/* Alerte informations manquantes */}
        {missingFields.length > 0 && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <AlertCircle size={20} color="#E67E22" strokeWidth={2.5} />
              <Text style={styles.warningTitle}>
                Profil incomplet ({missingFields.length} info
                {missingFields.length > 1 ? 's' : ''})
              </Text>
            </View>
            <Text style={styles.warningText}>
              Complétez votre profil pour une meilleure expérience :
            </Text>
            {missingFields.map((field, index) => (
              <View key={index} style={styles.warningItem}>
                <View style={styles.warningDot} />
                <Text style={styles.warningItemText}>{field}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.completeButton}>
              <Edit3 size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.completeButtonText}>
                Compléter mon profil
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.container}>
          {/* Informations de base */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de base</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <User size={20} color="#2196F3" strokeWidth={2.5} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Prénom</Text>
                  <Text style={styles.infoValue}>
                    {user?.first_name || 'Non renseigné'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <User size={20} color="#2196F3" strokeWidth={2.5} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nom</Text>
                  <Text style={styles.infoValue}>
                    {user?.last_name || 'Non renseigné'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Mail size={20} color="#2196F3" strokeWidth={2.5} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <User size={20} color="#2196F3" strokeWidth={2.5} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nom d'utilisateur</Text>
                  <Text style={styles.infoValue}>
                    {user?.username || 'Non renseigné'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Informations de contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de contact</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Phone size={20} color="#2196F3" strokeWidth={2.5} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Téléphone</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      !user?.phone_number && styles.infoValueMissing,
                    ]}
                  >
                    {user?.phone_number || 'Non renseigné'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MapPin size={20} color="#2196F3" strokeWidth={2.5} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Adresse</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      !user?.address && styles.infoValueMissing,
                    ]}
                  >
                    {user?.address || 'Non renseignée'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Informations médicales */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations médicales</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Calendar size={20} color="#27AE60" strokeWidth={2.5} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Date de naissance</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      !user?.birth_date && styles.infoValueMissing,
                    ]}
                  >
                    {formatDate(user?.birth_date) || 'Non renseignée'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FileText size={20} color="#27AE60" strokeWidth={2.5} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Commentaires médicaux</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      !user?.medical_comment && styles.infoValueMissing,
                    ]}
                  >
                    {user?.medical_comment || 'Aucun commentaire'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bouton Paramètres */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Settings size={20} color="#2196F3" strokeWidth={2.5} />
            <Text style={styles.settingsButtonText}>Paramètres</Text>
          </TouchableOpacity>

          {/* Bouton de déconnexion */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#E74C3C" strokeWidth={2.5} />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        {/* Espace pour la navbar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },

  // Header
  header: {
    backgroundColor: colors.secondary || '#FF9F1C',
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#2196F3',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  userDiabetesType: {
    marginTop: 14,
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },

  // Warning Card
  warningCard: {
    backgroundColor: '#FFF9F0',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE5B4',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E67E22',
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E67E22',
    marginRight: 8,
  },
  warningItemText: {
    fontSize: 13,
    color: '#666',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Section
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
    marginBottom: 12,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary || '#000000',
  },
  infoValueMissing: {
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 0,
  },

  // Settings Button
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 32,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2196F3',
  },

  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFEBEE',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E74C3C',
  },
  bottomPadding: {
    height: 100,
  },
});
