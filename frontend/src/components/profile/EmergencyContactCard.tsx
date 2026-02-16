import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Phone, X } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

interface EmergencyContactCardProps {
  readonly contact: EmergencyContact;
  readonly onCall: () => void;
  readonly onDelete: () => void;
}

export default function EmergencyContactCard({
  contact,
  onCall,
  onDelete,
}: EmergencyContactCardProps): React.JSX.Element {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{getInitials(contact.name)}</Text>
        </View>
        <View>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.relation}>{contact.relation}</Text>
          <Text style={styles.phone}>{contact.phone}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity style={styles.callButton} onPress={onCall}>
          <Phone size={18} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <X size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  relation: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  phone: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardRight: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
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
});
