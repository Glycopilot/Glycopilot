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
import { modalStyles } from './modalStyles';
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
      <Pressable style={modalStyles.overlay} onPress={onClose} />
      <View
        style={[
          modalStyles.container,
          styles.containerLarge,
          Platform.OS === 'ios' ? { paddingBottom: 34 } : null,
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <View style={modalStyles.handle} />

          <Text style={modalStyles.title}>Ma localisation</Text>

          <View style={modalStyles.infoCard}>
            <MapPin size={20} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.infoTitle}>
                Géolocalisation en temps réel
              </Text>
              <Text style={modalStyles.infoText}>
                Activez la localisation pour afficher votre position sur la
                carte.
              </Text>
            </View>
          </View>

          <LocationTracker onLocationUpdate={onLocationUpdate} />

          <TouchableOpacity
            style={[modalStyles.submitButton, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={modalStyles.submitButtonText}>Fermer</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  containerLarge: {
    maxHeight: '90%',
  },
  closeButton: {
    flex: 0,
    marginTop: 20,
  },
});
