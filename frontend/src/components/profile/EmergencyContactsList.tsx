import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, Plus } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import EmergencyContactCard, {
  type EmergencyContact,
} from './EmergencyContactCard';

interface EmergencyContactsListProps {
  readonly contacts: EmergencyContact[];
  readonly onAddContact: () => void;
  readonly onCallContact: (id: string) => void;
  readonly onDeleteContact: (id: string) => void;
}

export default function EmergencyContactsList({
  contacts,
  onAddContact,
  onCallContact,
  onDeleteContact,
}: EmergencyContactsListProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Users size={20} color={colors.textPrimary} />
          <Text style={styles.sectionTitle}>Contacts d'urgence</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAddContact}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.contactsList}>
        {contacts.map(contact => (
          <EmergencyContactCard
            key={contact.id}
            contact={contact}
            onCall={() => onCallContact(contact.id)}
            onDelete={() => onDeleteContact(contact.id)}
          />
        ))}
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsList: {
    gap: 12,
  },
});
