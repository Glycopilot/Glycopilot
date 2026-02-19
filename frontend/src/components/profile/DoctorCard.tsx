import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stethoscope, Phone, Mail, MapPin, Edit2 } from 'lucide-react-native';
import { colors } from '../../themes/colors';

interface Doctor {
  name: string;
  specialty: string;
  phone: string;
  email: string;
  address: string;
}

interface DoctorCardProps {
  readonly doctor: Doctor;
  readonly onEdit: () => void;
  readonly onCall: () => void;
}

export default function DoctorCard({
  doctor,
  onEdit,
  onCall,
}: DoctorCardProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Stethoscope size={20} color={colors.textPrimary} />
          <Text style={styles.sectionTitle}>Médecin traitant</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Edit2 size={16} color="#007AFF" />
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
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

        <TouchableOpacity style={styles.callButton} onPress={onCall}>
          <Phone size={18} color="#fff" />
          <Text style={styles.callButtonText}>Appeler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  card: {
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
});
