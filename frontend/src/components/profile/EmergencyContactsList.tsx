import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, Plus, UserPlus } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import EmergencyContactCard, {
  type EmergencyContact,
} from './EmergencyContactCard';
import LocationConsentCard from './LocationConsentCard';

interface EmergencyContactsListProps {
  readonly contacts: EmergencyContact[];
  readonly onAddContact: () => void;
  readonly onCallContact: (id: string) => void;
  readonly onDeleteContact: (id: string) => void;
  readonly onEditContact: (contact: EmergencyContact) => void;
}

export default function EmergencyContactsList({
  contacts,
  onAddContact,
  onCallContact,
  onDeleteContact,
  onEditContact,
}: EmergencyContactsListProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Users size={20} color={colors.textPrimary} />
          <Text style={styles.sectionTitle}>Mes proches</Text>
        </View>
        {contacts.length > 0 && (
          <TouchableOpacity style={styles.addButton} onPress={onAddContact}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyAvatar}>
            <Users size={32} color="#9CA3AF" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Aucun proche ajouté</Text>
          <Text style={styles.emptyText}>
            Invitez un proche à suivre votre glycémie en temps réel
          </Text>
          <TouchableOpacity style={styles.inviteButton} onPress={onAddContact}>
            <UserPlus size={18} color="#fff" />
            <Text style={styles.inviteButtonText}>Ajouter un proche</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {contacts.map(contact => (
            <EmergencyContactCard
              key={contact.id}
              contact={contact}
              onCall={() => onCallContact(contact.id)}
              onDelete={() => onDeleteContact(contact.id)}
              onEdit={() => onEditContact(contact)}
            />
          ))}
          <LocationConsentCard />
        </View>
      )}
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
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
