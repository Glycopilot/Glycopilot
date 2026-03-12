import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stethoscope } from 'lucide-react-native';
import { colors } from '../../themes/colors';

interface InviteDoctorModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly email: string;
  readonly onEmailChange: (text: string) => void;
  readonly onSubmit: () => void;
  readonly loading: boolean;
}

export default function InviteDoctorModal({
  visible,
  onClose,
  email,
  onEmailChange,
  onSubmit,
  loading,
}: InviteDoctorModalProps): React.JSX.Element {
  const isValidEmail = /\S+@\S+\.\S+/.test(email);

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
        <View style={styles.sheetHandle} />

        <Text style={styles.modalTitle}>Inviter un médecin</Text>
        <Text style={styles.modalSubtitle}>
          Invitez votre médecin traitant à rejoindre votre équipe de soins
        </Text>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Email du médecin</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={onEmailChange}
            placeholder="medecin@hopital.fr"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.infoCard}>
          <Stethoscope size={20} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Comment ça fonctionne ?</Text>
            <Text style={styles.infoText}>
              Une invitation sera envoyée à votre médecin. Une fois acceptée,
              il pourra suivre vos données de santé.
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
              (!isValidEmail || loading) && styles.submitButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={!isValidEmail || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Envoyer</Text>
            )}
          </TouchableOpacity>
        </View>
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
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
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
    marginBottom: 24,
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
