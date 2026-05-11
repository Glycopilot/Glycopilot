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
} from 'react-native';
import { Users } from 'lucide-react-native';
import { modalStyles as styles } from './modalStyles';

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
      <Pressable style={styles.overlay} onPress={onClose} />
      <View
        style={[
          styles.container,
          styles.containerScrollable,
          Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.handle} />

          <Text style={styles.title}>Ajouter un contact d'urgence</Text>

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
              <Text style={styles.submitButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
