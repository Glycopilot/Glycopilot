import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
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
import InviteDoctorModal from '../components/profile/InviteDoctorModal';
import doctorService from '../services/doctorService';
import type { Doctor, PendingInvite } from '../components/profile/DoctorCard';
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

  // Modal invitation médecin
  const [inviteDoctorModalVisible, setInviteDoctorModalVisible] = useState(false);
  const [inviteDoctorEmail, setInviteDoctorEmail] = useState('');
  const [inviteDoctorLoading, setInviteDoctorLoading] = useState(false);

  // Récupérer les données utilisateur depuis le backend
  const { user: userData, loading: userLoading, refetch } = useUser();
  const { logout } = useAuth();

  // Médecin traitant
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchDoctor = useCallback(async (): Promise<void> => {
    try {
      const team = await doctorService.getMyTeam();
      const referent = team.doctors.find(
        d => d.role === 'REFERENT_DOCTOR' && d.status === 'ACTIVE'
      ) ?? team.doctors[0] ?? null;

      if (referent) {
        const d = referent.member_details;
        setDoctor({
          name: `Dr. ${d.first_name} ${d.last_name}`,
          specialty: d.specialty ?? null,
          phone: d.phone_number ?? null,
          email: d.email ?? null,
          address: d.medical_center_address ?? null,
        });
      } else {
        setDoctor(null);
      }

      const pending = (team.pending_doctor_invites ?? []).map(inv => ({
        id_team_member: inv.id_team_member,
        doctorName: `Dr. ${inv.member_details.first_name} ${inv.member_details.last_name}`,
        specialty: inv.member_details.specialty ?? null,
      }));
      setPendingInvites(pending);

      const family = (team.family ?? []).map(f => ({
        id: f.id_team_member,
        name: `${f.member_details.first_name} ${f.member_details.last_name}`,
        relation: f.relation_type || 'Proche',
        phone: f.member_details.phone_number || '',
      }));
      setEmergencyContacts(family);
    } catch {
      setDoctor(null);
      setPendingInvites([]);
    }
  }, []);

  useEffect(() => {
    fetchDoctor();
  }, [fetchDoctor]);

  const handleAcceptInvite = async (id: string): Promise<void> => {
    try {
      setAcceptingId(id);
      await doctorService.acceptInvitation(id);
      Alert.alert('Succès', 'Invitation acceptée. Le médecin peut maintenant suivre vos données.');
      await fetchDoctor();
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message || "Impossible d'accepter l'invitation");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleInviteDoctor = async (): Promise<void> => {
    try {
      setInviteDoctorLoading(true);
      await doctorService.inviteDoctor(inviteDoctorEmail);
      Alert.alert('Invitation envoyée', `Une invitation a été envoyée à ${inviteDoctorEmail}.`);
      setInviteDoctorModalVisible(false);
      setInviteDoctorEmail('');
      await fetchDoctor();
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message || "Impossible d'envoyer l'invitation");
    } finally {
      setInviteDoctorLoading(false);
    }
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

  const addEmergencyContact = async (): Promise<void> => {
    if (!contactName.trim() || !contactPhone.trim()) return;

    const parts = contactName.trim().split(' ');
    const first_name = parts[0];
    const last_name = parts.slice(1).join(' ') || '.';

    try {
      const result = await doctorService.addFamilyMember({
        first_name,
        last_name,
        phone_number: contactPhone,
        relation_type: contactRelation || 'Proche',
      });

      const newContact: EmergencyContact = {
        id: result.id,
        name: contactName,
        relation: contactRelation || 'Proche',
        phone: contactPhone,
      };

      setEmergencyContacts(prev => [...prev, newContact]);
      setModalVisible(false);
      setContactName('');
      setContactRelation('');
      setContactPhone('');
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message || "Impossible d'ajouter le contact");
    }
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
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ProfileHeader user={userData} />

        <IncompleteProfileBanner
          user={userData}
          onPress={openEditProfileModal}
        />

        <DoctorCard
          doctor={doctor}
          pendingInvites={pendingInvites}
          onEdit={() => setInviteDoctorModalVisible(true)}
          onCall={() => {
            if (doctor?.phone) {
              Linking.openURL(`tel:${doctor.phone}`);
            }
          }}
          onInvite={() => setInviteDoctorModalVisible(true)}
          onAcceptInvite={handleAcceptInvite}
          acceptingId={acceptingId}
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

      <InviteDoctorModal
        visible={inviteDoctorModalVisible}
        onClose={() => {
          setInviteDoctorModalVisible(false);
          setInviteDoctorEmail('');
        }}
        email={inviteDoctorEmail}
        onEmailChange={setInviteDoctorEmail}
        onSubmit={handleInviteDoctor}
        loading={inviteDoctorLoading}
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
