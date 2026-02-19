import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import LocationTracker from './LocationTracker';

interface LocationModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onLocationUpdate: (
    lat: number,
    lng: number,
    address?: string
  ) => void;
}

export default function LocationModal({
  visible,
  onClose,
  onLocationUpdate,
}: LocationModalProps): React.JSX.Element {
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
          { maxHeight: '90%' },
          Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.sheetHandle} />

          <Text style={styles.modalTitle}>Ma localisation</Text>

          <View style={styles.infoCard}>
            <MapPin size={20} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                Géolocalisation en temps réel
              </Text>
              <Text style={styles.infoText}>
                Activez la localisation pour afficher votre position sur la
                carte.
              </Text>
            </View>
          </View>

          <LocationTracker onLocationUpdate={onLocationUpdate} />

          <TouchableOpacity
            style={[styles.submitButton, { marginTop: 20 }]}
            onPress={onClose}
          >
            <Text style={styles.submitButtonText}>Fermer</Text>
          </TouchableOpacity>
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
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
