import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Bell,
  Shield,
  MapPin,
  Settings,
  FileText,
  HelpCircle,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';
import useUser from '../hooks/useUser';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/authService';
import ProfileHeader from '../components/profile/ProfileHeader';
import IncompleteProfileBanner from '../components/profile/IncompleteProfileBanner';
import DoctorCard from '../components/profile/DoctorCard';
import EmergencyContactsList from '../components/profile/EmergencyContactsList';
import SettingsMenu, {
  type SettingMenuItem,
} from '../components/profile/SettingsMenu';
import ProfileActions from '../components/profile/ProfileActions';
import EditProfileModal from '../components/profile/EditProfileModal';
import AddContactModal from '../components/profile/AddContactModal';
import LocationModal from '../components/profile/LocationModal';
import type { EmergencyContact } from '../components/profile/EmergencyContactCard';

interface ProfileScreenProps {
  readonly navigation: {
    navigate: (screen: string) => void;
    reset?: (config: {
      index: number;
      routes: Array<{ name: string }>;
    }) => void;
  };
}

export default function ProfileScreen({
  navigation,
}: ProfileScreenProps): React.JSX.Element {
  const [modalVisible, setModalVisible] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Modal d'édition du profil
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDiabetesType, setEditDiabetesType] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showDiabetesTypePicker, setShowDiabetesTypePicker] = useState(false);

  // Modal de localisation
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Récupérer les données utilisateur depuis le backend
  const { user: userData, loading: userLoading, refetch } = useUser();
  const { logout } = useAuth();

  // Médecin traitant
  const doctor = {
    name: 'Dr. Sophie Dubois',
    specialty: 'Endocrinologue',
    phone: '+33 1 42 34 56 78',
    email: 'sophie.dubois@hopital.fr',
    address: '15 Rue de la Santé, 75014 Paris',
  };

  // Contacts d'urgence
  const [emergencyContacts, setEmergencyContacts] = useState<
    EmergencyContact[]
  >([
    {
      id: '1',
      name: 'Test User',
      relation: 'Frère',
      phone: '+33 0 00 00 00 00',
    },
  ]);

  // Menu settings
  const settingsMenu: SettingMenuItem[] = [
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      value: 'Activées',
      route: 'Notifications',
    },
    {
      id: 'location',
      icon: MapPin,
      label: 'Localisation',
      action: () => setLocationModalVisible(true),
    },
    {
      id: 'security',
      icon: Shield,
      label: 'Sécurité & Confidentialité',
      route: 'Security',
    },
    {
      id: 'reports',
      icon: FileText,
      label: 'Rapports médicaux',
      route: 'Reports',
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Paramètres généraux',
      route: 'Settings',
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Aide & Support',
      route: 'Help',
    },
  ];

  const addEmergencyContact = (): void => {
    if (!contactName.trim() || !contactPhone.trim()) return;

    const newContact: EmergencyContact = {
      id: `${Date.now()}`,
      name: contactName,
      relation: contactRelation || 'Proche',
      phone: contactPhone,
    };

    setEmergencyContacts(prev => [...prev, newContact]);
    setModalVisible(false);
    setContactName('');
    setContactRelation('');
    setContactPhone('');
  };

  const removeContact = (id: string): void => {
    setEmergencyContacts(prev => prev.filter(c => c.id !== id));
  };

  const openEditProfileModal = (): void => {
    setEditFirstName(userData?.firstName || '');
    setEditLastName(userData?.lastName || '');
    setEditPhone(userData?.phoneNumber || '');
    setEditAddress(userData?.address || '');
    setEditDiabetesType(userData?.diabetesType || '');
    setEditProfileModalVisible(true);
  };

  const handlePhoneChange = (text: string): void => {
    const sanitized = text.replaceAll(/[^0-9+\-()\s]/g, '');
    if (sanitized.length <= 20) {
      setEditPhone(sanitized);
    }
  };

  const handleContactPhoneChange = (text: string): void => {
    const sanitized = text.replaceAll(/[^0-9+\-()\s]/g, '');
    if (sanitized.length <= 14) {
      setContactPhone(sanitized);
    }
  };

  const handleDiabetesTypeChange = (type: string): void => {
    setEditDiabetesType(type);
    setShowDiabetesTypePicker(false);
  };

  const handleUpdateProfile = async (): Promise<void> => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      Alert.alert('Erreur', 'Le prénom et le nom sont obligatoires');
      return;
    }

    try {
      setUpdating(true);

      const updateData: {
        firstName: string;
        lastName: string;
        phoneNumber: string;
        address: string;
        diabetesType?: string;
      } = {
        firstName: editFirstName,
        lastName: editLastName,
        phoneNumber: editPhone,
        address: editAddress,
      };

      // Ajouter les champs médicaux si remplis
      if (editDiabetesType) {
        updateData.diabetesType = editDiabetesType;
      }

      await authService.updateProfile(updateData);

      // Rafraîchir les données utilisateur
      await refetch();

      Alert.alert('Succès', 'Profil mis à jour avec succès');
      setEditProfileModalVisible(false);
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: () => {
          logout()
            .then(() => {
              if (navigation.reset) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            })
            .catch(() => {
              Alert.alert('Erreur', 'Erreur lors de la déconnexion');
            });
        },
      },
    ]);
  };

  if (userLoading) {
    return (
      <Layout
        navigation={navigation}
        currentRoute="Profile"
        userName=""
        onNotificationPress={() => console.log('Notifications')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      navigation={navigation}
      currentRoute="Profile"
      userName={userData?.firstName || 'Utilisateur'}
      onNotificationPress={() => console.log('Notifications')}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ProfileHeader user={userData} />

        <IncompleteProfileBanner
          user={userData}
          onPress={openEditProfileModal}
        />

        <DoctorCard
          doctor={doctor}
          onEdit={() => console.log('Modifier médecin')}
          onCall={() => console.log('Appeler médecin')}
        />

        <EmergencyContactsList
          contacts={emergencyContacts}
          onAddContact={() => setModalVisible(true)}
          onCallContact={id => console.log('Appeler contact:', id)}
          onDeleteContact={removeContact}
        />

        <SettingsMenu items={settingsMenu} />

        <ProfileActions
          onEditProfile={openEditProfileModal}
          onLogout={handleLogout}
        />

        <View style={styles.bottomPadding} />
      </ScrollView>

      <AddContactModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        contactName={contactName}
        contactRelation={contactRelation}
        contactPhone={contactPhone}
        onNameChange={setContactName}
        onRelationChange={setContactRelation}
        onPhoneChange={handleContactPhoneChange}
        onSubmit={addEmergencyContact}
      />

      <EditProfileModal
        visible={editProfileModalVisible}
        onClose={() => setEditProfileModalVisible(false)}
        firstName={editFirstName}
        lastName={editLastName}
        phone={editPhone}
        address={editAddress}
        diabetesType={editDiabetesType}
        showDiabetesTypePicker={showDiabetesTypePicker}
        updating={updating}
        onFirstNameChange={setEditFirstName}
        onLastNameChange={setEditLastName}
        onPhoneChange={handlePhoneChange}
        onAddressChange={setEditAddress}
        onAddressSelect={setEditAddress}
        onDiabetesTypeChange={handleDiabetesTypeChange}
        onToggleDiabetesTypePicker={() =>
          setShowDiabetesTypePicker(!showDiabetesTypePicker)
        }
        onSubmit={handleUpdateProfile}
      />

      <LocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onLocationUpdate={(lat, lng, address) => {
          console.log('Position mise à jour:', { lat, lng, address });
        }}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});
