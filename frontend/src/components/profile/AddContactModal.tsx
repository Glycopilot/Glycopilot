import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { Users } from 'lucide-react-native';
import { colors } from '../../themes/colors';

interface AddContactModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly contactName: string;
  readonly contactRelation: string;
  readonly contactPhone: string;
  readonly onNameChange: (text: string) => void;
  readonly onRelationChange: (text: string) => void;
  readonly onPhoneChange: (text: string) => void;
  readonly onSubmit: () => void;
}

export default function AddContactModal({
  visible,
  onClose,
  contactName,
  contactRelation,
  contactPhone,
  onNameChange,
  onRelationChange,
  onPhoneChange,
  onSubmit,
}: AddContactModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose} />
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
              onChangeText={onNameChange}
              placeholder="Ex: Marie Dupont"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Relation</Text>
            <TextInput
              style={styles.input}
              value={contactRelation}
              onChangeText={onRelationChange}
              placeholder="Ex: Mère, Conjoint, Ami..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={onPhoneChange}
              placeholder="+33 6 12 34 56 78"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={20}
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
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!contactName || !contactPhone) && styles.submitButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={!contactName || !contactPhone}
            >
              <Text style={styles.submitButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
