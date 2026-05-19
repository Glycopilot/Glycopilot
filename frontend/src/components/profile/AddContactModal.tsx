import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Users } from 'lucide-react-native';
import { modalStyles as styles } from './modalStyles';

interface AddContactModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly contactName: string;
  readonly contactRelation: string;
  readonly contactPhone: string;
  readonly contactEmail: string;
  readonly onNameChange: (text: string) => void;
  readonly onRelationChange: (text: string) => void;
  readonly onPhoneChange: (text: string) => void;
  readonly onEmailChange: (text: string) => void;
  readonly onSubmit: () => void;
  readonly isEdit?: boolean;
}

export default function AddContactModal({
  visible,
  onClose,
  contactName,
  contactRelation,
  contactPhone,
  contactEmail,
  onNameChange,
  onRelationChange,
  onPhoneChange,
  onEmailChange,
  onSubmit,
  isEdit = false,
}: AddContactModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, styles.containerScrollable, Platform.OS === 'ios' ? { paddingBottom: 34 } : null]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.handle} />

          <Text style={styles.title}>
            {isEdit ? 'Modifier le proche' : 'Ajouter un proche'}
          </Text>

          {!isEdit && (
            <View style={styles.infoCard}>
              <Users size={20} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Accès à l'application</Text>
                <Text style={styles.infoText}>
                  Avec un email, votre proche recevra une invitation pour créer son
                  compte et consulter votre glycémie en temps réel.
                </Text>
              </View>
            </View>
          )}

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

          {!isEdit && (
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={contactEmail}
                onChangeText={onEmailChange}
                placeholder="marie@exemple.fr"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.buttons}>
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
              <Text style={styles.submitButtonText}>
                {isEdit ? 'Enregistrer' : 'Ajouter'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
