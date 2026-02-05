import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import {
  User,
  Bell,
  Shield,
  Heart,
  Activity,
  Calendar,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  ChevronRight,
  Edit2,
  Stethoscope,
  Users,
  Settings,
  FileText,
  HelpCircle,
  LogOut,
  Plus,
  X,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';

// Types
interface DoctorInfo {
  name: string;
  specialty: string;
  phone: string;
  email: string;
  address: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

interface ProfileScreenProps {
  navigation: {
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
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Données utilisateur
  const user = {
    firstName: 'User',
    lastName: 'Test',
    email: 'user.test@email.com',
    phone: '+33 1 11 11 11 11',
    diabetesType: 'Type 1',
    diagnosisYear: 2019,
  };

  // Médecin traitant
  const [doctor, setDoctor] = useState<DoctorInfo>({
    name: 'Dr. Sophie Dubois',
    specialty: 'Endocrinologue',
    phone: '+33 1 42 34 56 78',
    email: 'sophie.dubois@hopital.fr',
    address: '15 Rue de la Santé, 75014 Paris',
  });

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
  const settingsMenu = [
    {
      icon: Bell,
      label: 'Notifications',
      value: 'Activées',
      route: 'Notifications',
    },
    { icon: Shield, label: 'Sécurité & Confidentialité', route: 'Security' },
    { icon: FileText, label: 'Rapports médicaux', route: 'Reports' },
    { icon: Settings, label: 'Paramètres généraux', route: 'Settings' },
    { icon: HelpCircle, label: 'Aide & Support', route: 'Help' },
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

  return (
    <Layout
      navigation={navigation}
      currentRoute="Profile"
      userName={user.firstName}
      onNotificationPress={() => console.log('Notifications')}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <User size={40} color="#fff" strokeWidth={2} />
          </View>
          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.diabetesInfo}>
            <View style={styles.diabetesBadge}>
              <Text style={styles.diabetesText}>
                {user.diabetesType} • Depuis {user.diagnosisYear}
              </Text>
            </View>
          </View>
        </View>

        {/* Médecin traitant */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Stethoscope size={20} color={colors.textPrimary} />
              <Text style={styles.sectionTitle}>Médecin traitant</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setDoctorModalVisible(true)}
            >
              <Edit2 size={16} color="#007AFF" />
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.doctorCard}>
            <View style={styles.doctorInfo}>
              <View style={styles.doctorAvatar}>
                <Stethoscope size={24} color="#007AFF" strokeWidth={2} />
              </View>
              <View style={styles.doctorDetails}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              </View>
            </View>

            <View style={styles.contactDetails}>
              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}>
                  <Phone size={16} color="#007AFF" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Téléphone</Text>
                  <Text style={styles.contactValue}>{doctor.phone}</Text>
                </View>
              </View>

              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}>
                  <Mail size={16} color="#007AFF" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>{doctor.email}</Text>
                </View>
              </View>

              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}>
                  <MapPin size={16} color="#007AFF" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Adresse</Text>
                  <Text style={styles.contactValue}>{doctor.address}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.callButton}>
              <Phone size={18} color="#fff" />
              <Text style={styles.callButtonText}>Appeler</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contacts d'urgence */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Users size={20} color={colors.textPrimary} />
              <Text style={styles.sectionTitle}>Contacts d'urgence</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.contactsList}>
            {emergencyContacts.map(contact => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactCardLeft}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitials}>
                      {contact.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRelation}>
                      {contact.relation}
                    </Text>
                    <Text style={styles.contactPhoneText}>{contact.phone}</Text>
                  </View>
                </View>
                <View style={styles.contactCardRight}>
                  <TouchableOpacity style={styles.callIconButton}>
                    <Phone size={18} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => removeContact(contact.id)}
                  >
                    <X size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Paramètres */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>
            Paramètres
          </Text>
          <View style={styles.settingsList}>
            {settingsMenu.map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.settingItem}
                  onPress={() => console.log(item.route)}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.settingIconContainer}>
                      <Icon size={20} color="#007AFF" strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      {item.value && (
                        <Text style={styles.settingValue}>{item.value}</Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.editProfileButton}>
            <Edit2 size={18} color="#007AFF" />
            <Text style={styles.editProfileText}>Modifier le profil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton}>
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal Ajouter Contact */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        />
        <View
          style={[
            styles.modalContainer,
            Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.sheetHandle} />

            <Text style={styles.modalTitle}>Ajouter un contact d'urgence</Text>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Nom complet</Text>
              <TextInput
                style={styles.input}
                value={contactName}
                onChangeText={setContactName}
                placeholder="Ex: Marie Dupont"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Relation</Text>
              <TextInput
                style={styles.input}
                value={contactRelation}
                onChangeText={setContactRelation}
                placeholder="Ex: Mère, Conjoint, Ami..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.infoCard}>
              <Users size={20} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Information</Text>
                <Text style={styles.infoText}>
                  Ces contacts pourront être alertés en cas d'urgence via
                  l'application.
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!contactName || !contactPhone) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={addEmergencyContact}
                disabled={!contactName || !contactPhone}
              >
                <Text style={styles.submitButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
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
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  contactDetails: {
    gap: 16,
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    gap: 12,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    paddingVertical: 14,
    borderRadius: 12,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  contactsList: {
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  contactRelation: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  contactPhoneText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  contactCardRight: {
    flexDirection: 'row',
    gap: 8,
  },
  callIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 13,
    color: colors.textSecondary,
  },
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
  bottomPadding: {
    height: 100,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
