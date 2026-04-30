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
import { modalStyles } from './modalStyles';

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
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose} />
      <View
        style={[
          modalStyles.container,
          Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
        ]}
      >
        <View style={modalStyles.handle} />

        <Text style={[modalStyles.title, styles.titleSmallMargin]}>
          Inviter un médecin
        </Text>
        <Text style={styles.subtitle}>
          Invitez votre médecin traitant à rejoindre votre équipe de soins
        </Text>

        <View style={modalStyles.formSection}>
          <Text style={modalStyles.formLabel}>Email du médecin</Text>
          <TextInput
            style={modalStyles.input}
            value={email}
            onChangeText={onEmailChange}
            placeholder="medecin@hopital.fr"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={modalStyles.infoCard}>
          <Stethoscope size={20} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            <Text style={modalStyles.infoTitle}>Comment ça fonctionne ?</Text>
            <Text style={modalStyles.infoText}>
              Une invitation sera envoyée à votre médecin. Une fois acceptée,
              il pourra suivre vos données de santé.
            </Text>
          </View>
        </View>

        <View style={modalStyles.buttons}>
          <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
            <Text style={modalStyles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              modalStyles.submitButton,
              (!isValidEmail || loading) && modalStyles.submitButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={!isValidEmail || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={modalStyles.submitButtonText}>Envoyer</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  titleSmallMargin: {
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
});
