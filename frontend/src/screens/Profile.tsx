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
import InviteDoctorModal from '../components/profile/InviteDoctorModal';
import doctorService from '../services/doctorService';
import { toastSuccess, toastError } from '../services/toastService';
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
  const [contactEmail, setContactEmail] = useState('');

  // Modal d'édition d'un proche
  const [editContactModalVisible, setEditContactModalVisible] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactRelation, setEditContactRelation] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');

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

  // Modal invitation médecin
  const [inviteDoctorModalVisible, setInviteDoctorModalVisible] = useState(false);
  const [inviteDoctorEmail, setInviteDoctorEmail] = useState('');
  const [inviteDoctorLoading, setInviteDoctorLoading] = useState(false);

  // Récupérer les données utilisateur depuis le backend
  const { user: userData, loading: userLoading, refetch } = useUser();
  const { logout } = useAuth();

  // Médecin traitant
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [doctorTeamMemberId, setDoctorTeamMemberId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [removingDoctor, setRemovingDoctor] = useState(false);

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
        setDoctorTeamMemberId(referent.id_team_member);
      } else {
        setDoctor(null);
        setDoctorTeamMemberId(null);
      }

      const pending = (team.pending_doctor_invites ?? []).map(inv => ({
        id_team_member: inv.id_team_member,
        doctorName: `Dr. ${inv.member_details.first_name} ${inv.member_details.last_name}`,
        specialty: inv.member_details.specialty ?? null,
        direction: inv.approved_by ? 'received' : 'sent',
      }));
      setPendingInvites(pending);

      const family = (team.family ?? []).map(f => ({
        id: f.id_team_member,
        name: `${f.member_details.first_name} ${f.member_details.last_name}`,
        relation: f.relation_type || 'Proche',
        phone: f.member_details.phone_number || '',
        email: f.member_details.email ?? undefined,
        status: 'ACTIVE' as const,
      }));
      const pendingFamily = (team.pending_family ?? []).map(f => ({
        id: f.id_team_member,
        name: `${f.member_details.first_name} ${f.member_details.last_name}`,
        relation: f.relation_type || 'Proche',
        phone: f.member_details.phone_number || '',
        email: f.member_details.email ?? undefined,
        status: 'PENDING' as const,
      }));
      setEmergencyContacts([...family, ...pendingFamily]);
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

  const handleCancelInvite = async (id: string): Promise<void> => {
    try {
      setCancelingId(id);
      await doctorService.removeTeamMember(id);
      await fetchDoctor();
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message || "Impossible d'annuler l'invitation");
    } finally {
      setCancelingId(null);
    }
  };

  const handleRemoveDoctor = async (): Promise<void> => {
    if (!doctorTeamMemberId) return;
    Alert.alert(
      'Retirer le médecin',
      'Êtes-vous sûr de vouloir retirer ce médecin de votre équipe de soin ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingDoctor(true);
              await doctorService.removeTeamMember(doctorTeamMemberId);
              await fetchDoctor();
            } catch (error) {
              Alert.alert('Erreur', (error as Error).message || 'Impossible de retirer le médecin');
            } finally {
              setRemovingDoctor(false);
            }
          },
        },
      ]
    );
  };

  const handleInviteDoctorClose = (): void => {
    setInviteDoctorModalVisible(false);
    setInviteDoctorEmail('');
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
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

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
        ...(contactEmail.trim() ? { email: contactEmail.trim().toLowerCase() } : {}),
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
      setContactEmail('');

      if (!result.invitation_sent) {
        toastSuccess('Proche ajouté', `${contactName} a été ajouté à vos proches.`);
      } else if (result.status === 'ACTIVE') {
        toastSuccess(
          'Proche ajouté',
          `${contactName} a déjà un compte Glycopilot et a été directement lié à votre équipe.`
        );
      } else {
        toastSuccess(
          'Invitation envoyée',
          `Un code d'activation a été envoyé à ${contactEmail.trim()}.`
        );
      }
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === 'already_proche') {
        setModalVisible(false);
        Alert.alert(
          'Proche déjà lié',
          "Cette personne suit déjà un patient sur Glycopilot.\n\nUn proche ne peut suivre qu'un seul patient à la fois : elle ne pourra pas accéder à votre glycémie.",
          [{ text: 'Compris', style: 'default' }]
        );
      } else {
        toastError('Erreur', err.message || "Impossible d'ajouter le proche");
      }
    }
  };

  const confirmRemoveContact = async (id: string): Promise<void> => {
    try {
      await doctorService.removeTeamMember(id);
      setEmergencyContacts(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message || 'Impossible de supprimer le contact');
    }
  };

  const removeContact = (id: string): void => {
    Alert.alert(
      'Retirer le proche',
      'Êtes-vous sûr de vouloir retirer ce proche de votre équipe ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => confirmRemoveContact(id),
        },
      ]
    );
  };

  const openEditContact = (contact: EmergencyContact): void => {
    setEditingContactId(contact.id);
    setEditContactName(contact.name);
    setEditContactRelation(contact.relation);
    setEditContactPhone(contact.phone);
    setEditContactModalVisible(true);
  };

  const handleEditContactPhoneChange = (text: string): void => {
    const sanitized = text.replaceAll(/[^0-9+\-()\s]/g, '');
    if (sanitized.length <= 14) {
      setEditContactPhone(sanitized);
    }
  };

  const updateContact = async (): Promise<void> => {
    if (!editingContactId || !editContactName.trim() || !editContactPhone.trim()) return;

    const parts = editContactName.trim().split(' ');
    const first_name = parts[0];
    const last_name = parts.slice(1).join(' ') || '.';

    try {
      await doctorService.updateFamilyMember({
        id_team_member: editingContactId,
        first_name,
        last_name,
        phone_number: editContactPhone,
        relation_type: editContactRelation || 'Proche',
      });

      setEmergencyContacts(prev =>
        prev.map(c =>
          c.id === editingContactId
            ? { ...c, name: editContactName.trim(), relation: editContactRelation || 'Proche', phone: editContactPhone }
            : c
        )
      );
      setEditContactModalVisible(false);
      setEditingContactId(null);
      toastSuccess('Contact modifié', `${editContactName.trim()} a été mis à jour`);
    } catch (error) {
      toastError('Erreur', (error as Error).message || 'Impossible de modifier le contact');
    }
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
          onCall={() => {
            if (doctor?.phone) {
              Linking.openURL(`tel:${doctor.phone}`);
            }
          }}
          onInvite={() => setInviteDoctorModalVisible(true)}
          onAcceptInvite={handleAcceptInvite}
          onCancelInvite={handleCancelInvite}
          onRemoveDoctor={handleRemoveDoctor}
          acceptingId={acceptingId}
          cancelingId={cancelingId}
          removingDoctor={removingDoctor}
        />

        <EmergencyContactsList
          contacts={emergencyContacts}
          onAddContact={() => setModalVisible(true)}
          onCallContact={id => {
            const contact = emergencyContacts.find(c => c.id === id);
            if (contact?.phone) Linking.openURL(`tel:${contact.phone}`);
          }}
          onDeleteContact={removeContact}
          onEditContact={openEditContact}
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
        contactEmail={contactEmail}
        onNameChange={setContactName}
        onRelationChange={setContactRelation}
        onPhoneChange={handleContactPhoneChange}
        onEmailChange={setContactEmail}
        onSubmit={addEmergencyContact}
      />

      <AddContactModal
        visible={editContactModalVisible}
        onClose={() => setEditContactModalVisible(false)}
        contactName={editContactName}
        contactRelation={editContactRelation}
        contactPhone={editContactPhone}
        contactEmail=""
        onNameChange={setEditContactName}
        onRelationChange={setEditContactRelation}
        onPhoneChange={handleEditContactPhoneChange}
        onEmailChange={() => undefined}
        onSubmit={updateContact}
        isEdit
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


      <InviteDoctorModal
        visible={inviteDoctorModalVisible}
        onClose={handleInviteDoctorClose}
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
