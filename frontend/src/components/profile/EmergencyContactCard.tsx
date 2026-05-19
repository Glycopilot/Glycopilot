import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Phone, Mail, Clock, X, Pencil, Users } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  status?: 'ACTIVE' | 'PENDING';
  email?: string;
}

interface EmergencyContactCardProps {
  readonly contact: EmergencyContact;
  readonly onCall: () => void;
  readonly onDelete: () => void;
  readonly onEdit: () => void;
}

export default function EmergencyContactCard({
  contact,
  onCall,
  onDelete,
  onEdit,
}: EmergencyContactCardProps): React.JSX.Element {
  const getInitials = (name: string): string =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isPending = contact.status === 'PENDING';

  if (isPending) {
    return (
      <View style={styles.pendingCard}>
        <View style={styles.pendingAvatar}>
          <Clock size={20} color="#D97706" />
        </View>
        <View style={styles.pendingInfo}>
          <Text style={styles.pendingName}>{contact.name}</Text>
          <Text style={styles.pendingRelation}>{contact.relation}</Text>
          <Text style={styles.pendingLabel}>En attente d'activation</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <X size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.contactHeader}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{getInitials(contact.name)}</Text>
        </View>
        <View style={styles.headerDetails}>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.relation}>{contact.relation}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Pencil size={16} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <X size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {(contact.phone || contact.email) && (
        <View style={styles.contactDetails}>
          {contact.phone ? (
            <View style={styles.contactItem}>
              <View style={styles.contactIconContainer}>
                <Phone size={16} color="#007AFF" />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Téléphone</Text>
                <Text style={styles.contactValue}>{contact.phone}</Text>
              </View>
            </View>
          ) : null}
          {contact.email ? (
            <View style={styles.contactItem}>
              <View style={styles.contactIconContainer}>
                <Mail size={16} color="#007AFF" />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{contact.email}</Text>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {contact.phone ? (
        <TouchableOpacity style={styles.callButton} onPress={onCall}>
          <Phone size={18} color="#fff" />
          <Text style={styles.callButtonText}>Appeler</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  pendingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  pendingRelation: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '600',
    marginBottom: 2,
  },
  pendingLabel: {
    fontSize: 12,
    color: '#92400E',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  headerDetails: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  relation: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
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
    justifyContent: 'center',
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
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
