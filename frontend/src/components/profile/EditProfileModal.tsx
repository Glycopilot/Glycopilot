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
  ActivityIndicator,
} from 'react-native';
import { User, ChevronRight } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import AddressAutocomplete from './Addressautocomplete ';

interface EditProfileModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly address: string;
  readonly diabetesType: string;
  readonly showDiabetesTypePicker: boolean;
  readonly updating: boolean;
  readonly onFirstNameChange: (text: string) => void;
  readonly onLastNameChange: (text: string) => void;
  readonly onPhoneChange: (text: string) => void;
  readonly onAddressChange: (text: string) => void;
  readonly onAddressSelect: (address: string) => void;
  readonly onDiabetesTypeChange: (type: string) => void;
  readonly onToggleDiabetesTypePicker: () => void;
  readonly onSubmit: () => void;
}

export default function EditProfileModal({
  visible,
  onClose,
  firstName,
  lastName,
  phone,
  address,
  diabetesType,
  showDiabetesTypePicker,
  updating,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onAddressChange,
  onAddressSelect,
  onDiabetesTypeChange,
  onToggleDiabetesTypePicker,
  onSubmit,
}: EditProfileModalProps): React.JSX.Element {
  const getDiabetesTypeLabel = (): string => {
    if (!diabetesType) return 'Sélectionner un type';
    if (diabetesType === 'TYPE1') return 'Type 1';
    if (diabetesType === 'TYPE2') return 'Type 2';
    return 'Gestationnel';
  };

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sheetHandle} />

          <Text style={styles.modalTitle}>Modifier mon profil</Text>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Prénom *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={onFirstNameChange}
              placeholder="Votre prénom"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Nom *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={onLastNameChange}
              placeholder="Votre nom"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={onPhoneChange}
              placeholder="+33 6 12 34 56 78"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={20}
            />
          </View>

          <View style={[styles.formSection, { zIndex: 1000 }]}>
            <AddressAutocomplete
              value={address}
              onChangeText={onAddressChange}
              onSelectAddress={onAddressSelect}
              placeholder="Rechercher votre adresse..."
              label="Adresse"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Type de diabète</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={onToggleDiabetesTypePicker}
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  !diabetesType && styles.placeholderText,
                ]}
              >
                {getDiabetesTypeLabel()}
              </Text>
              <ChevronRight
                size={20}
                color="#9CA3AF"
                style={{
                  transform: [
                    { rotate: showDiabetesTypePicker ? '90deg' : '0deg' },
                  ],
                }}
              />
            </TouchableOpacity>
            {showDiabetesTypePicker && (
              <View style={styles.pickerOptions}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => onDiabetesTypeChange('TYPE1')}
                >
                  <Text style={styles.pickerOptionText}>Type 1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => onDiabetesTypeChange('TYPE2')}
                >
                  <Text style={styles.pickerOptionText}>Type 2</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => onDiabetesTypeChange('GESTATIONAL')}
                >
                  <Text style={styles.pickerOptionText}>Gestationnel</Text>
                </TouchableOpacity>
                {Boolean(diabetesType) && (
                  <TouchableOpacity
                    style={[styles.pickerOption, styles.clearOption]}
                    onPress={() => onDiabetesTypeChange('')}
                  >
                    <Text
                      style={[styles.pickerOptionText, styles.clearOptionText]}
                    >
                      Effacer
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <User size={20} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Information</Text>
              <Text style={styles.infoText}>
                Ces informations vous permettent de compléter votre profil
                médical.
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
                (!firstName.trim() || !lastName.trim() || updating) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={!firstName.trim() || !lastName.trim() || updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Sauvegarder</Text>
              )}
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
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  pickerOptions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  clearOption: {
    backgroundColor: '#FEE2E2',
  },
  clearOptionText: {
    color: '#EF4444',
    fontWeight: '600',
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
