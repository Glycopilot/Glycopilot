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
import { modalStyles } from './modalStyles';

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
      <Pressable style={modalStyles.overlay} onPress={onClose} />
      <View
        style={[
          modalStyles.container,
          modalStyles.containerScrollable,
          Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={modalStyles.handle} />

          <Text style={modalStyles.title}>Modifier mon profil</Text>

          <View style={modalStyles.formSection}>
            <Text style={modalStyles.formLabel}>Prénom *</Text>
            <TextInput
              style={modalStyles.input}
              value={firstName}
              onChangeText={onFirstNameChange}
              placeholder="Votre prénom"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={modalStyles.formSection}>
            <Text style={modalStyles.formLabel}>Nom *</Text>
            <TextInput
              style={modalStyles.input}
              value={lastName}
              onChangeText={onLastNameChange}
              placeholder="Votre nom"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={modalStyles.formSection}>
            <Text style={modalStyles.formLabel}>Téléphone</Text>
            <TextInput
              style={modalStyles.input}
              value={phone}
              onChangeText={onPhoneChange}
              placeholder="+33 6 12 34 56 78"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={20}
            />
          </View>

          <View style={[modalStyles.formSection, { zIndex: 1000 }]}>
            <AddressAutocomplete
              value={address}
              onChangeText={onAddressChange}
              onSelectAddress={onAddressSelect}
              placeholder="Rechercher votre adresse..."
              label="Adresse"
            />
          </View>

          <View style={modalStyles.formSection}>
            <Text style={modalStyles.formLabel}>Type de diabète</Text>
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

          <View style={modalStyles.infoCard}>
            <User size={20} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.infoTitle}>Information</Text>
              <Text style={modalStyles.infoText}>
                Ces informations vous permettent de compléter votre profil
                médical.
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
                (!firstName.trim() || !lastName.trim() || updating) &&
                  modalStyles.submitButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={!firstName.trim() || !lastName.trim() || updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.submitButtonText}>Sauvegarder</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
});
