import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import { toastSuccess, toastError } from '../../services/toastService';
import authService from '../../services/authService';

/**
 * Carte d'activation/désactivation de la 2FA par email.
 * Autonome : récupère son état, envoie le code et le vérifie via une modal.
 */
export default function TwoFactorCard(): React.JSX.Element {
  const [enabled, setEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Action en cours : true = on veut activer, false = on veut désactiver
  const [pendingEnable, setPendingEnable] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const status = await authService.getTwoFactorStatus();
        if (active) setEnabled(Boolean(status));
      } finally {
        if (active) setLoadingStatus(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const requestToggle = useCallback(async (next: boolean) => {
    setPendingEnable(next);
    setSubmitting(true);
    try {
      await authService.sendTwoFactorCode();
      setCode('');
      setModalVisible(true);
      toastSuccess('Code envoyé', 'Saisissez le code reçu par email.');
    } catch {
      toastError('Erreur', "Impossible d'envoyer le code. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }, []);

  const confirmCode = useCallback(async () => {
    if (code.trim().length < 6) {
      toastError('Code incomplet', 'Le code contient 6 chiffres.');
      return;
    }
    setSubmitting(true);
    try {
      if (pendingEnable) {
        await authService.enableTwoFactor(code.trim());
        setEnabled(true);
        toastSuccess('2FA activée', 'Un code vous sera demandé à chaque connexion.');
      } else {
        await authService.disableTwoFactor(code.trim());
        setEnabled(false);
        toastSuccess('2FA désactivée', '');
      }
      setModalVisible(false);
    } catch (error) {
      toastError((error as Error).message || 'Code invalide', '');
    } finally {
      setSubmitting(false);
    }
  }, [code, pendingEnable]);

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <ShieldCheck size={20} color="#007AFF" />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>Validation en deux étapes</Text>
        <Text style={styles.subtitle}>Code envoyé par email à chaque connexion</Text>
      </View>
      {loadingStatus ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <Switch
          value={enabled}
          onValueChange={requestToggle}
          disabled={submitting}
          trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
          thumbColor="#fff"
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {pendingEnable ? 'Activer la 2FA' : 'Désactiver la 2FA'}
            </Text>
            <Text style={styles.modalHint}>Saisissez le code à 6 chiffres reçu par email.</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={submitting}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmCode} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  modalHint: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
