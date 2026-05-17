import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { User, Phone, Mail, MapPin, Lock, LogOut, Save } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import useUser from '../../hooks/useUser';
import authService from '../../services/authService';
import { toastSuccess, toastError } from '../../services/toastService';

interface Props {
  readonly onLogout: () => void;
}

export default function ProcheProfileView({ onLogout }: Readonly<Props>) {
  const { user, loading, refetch } = useUser();

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Mot de passe
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setPhone(user.phoneNumber || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const handlePhoneChange = (text: string) => {
    const sanitized = text.replace(/[^0-9+\-()\s]/g, '');
    if (sanitized.length <= 20) setPhone(sanitized);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authService.updateProfile({ phoneNumber: phone, address });
      await refetch();
      toastSuccess('Profil mis à jour', 'Vos informations ont été enregistrées.');
    } catch (e) {
      toastError('Erreur', (e as Error).message || 'Impossible de mettre à jour le profil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toastError('Champs manquants', 'Remplissez tous les champs.');
      return;
    }
    if (newPwd.length < 8) {
      toastError('Mot de passe trop court', 'Minimum 8 caractères.');
      return;
    }
    if (newPwd !== confirmPwd) {
      toastError('Confirmation incorrecte', 'Les mots de passe ne correspondent pas.');
      return;
    }
    setSavingPwd(true);
    try {
      await authService.changePassword(currentPwd, newPwd);
      toastSuccess('Mot de passe modifié', 'Votre mot de passe a été mis à jour.');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (e) {
      toastError('Erreur', (e as Error).message || 'Mot de passe actuel incorrect.');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: onLogout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.role}>Accès proche</Text>
      </View>

      {/* Infos de base (read-only) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>

        <View style={styles.fieldRow}>
          <View style={styles.fieldIcon}><Mail size={18} color="#9CA3AF" /></View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValueReadonly}>{user?.email || '—'}</Text>
          </View>
        </View>
      </View>

      {/* Champs éditables */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modifier mes informations</Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <Phone size={18} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="Téléphone"
              placeholderTextColor="#D1D5DB"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <MapPin size={18} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Adresse"
              placeholderTextColor="#D1D5DB"
              autoCorrect={false}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Save size={16} color="#fff" />
                <Text style={styles.btnText}>Enregistrer</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Changement de mot de passe */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Changer le mot de passe</Text>

        {[
          { placeholder: 'Mot de passe actuel', value: currentPwd, onChange: setCurrentPwd },
          { placeholder: 'Nouveau mot de passe', value: newPwd, onChange: setNewPwd },
          { placeholder: 'Confirmer le nouveau', value: confirmPwd, onChange: setConfirmPwd },
        ].map(({ placeholder, value, onChange }) => (
          <View key={placeholder} style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <Lock size={18} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#D1D5DB"
                secureTextEntry
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, savingPwd && styles.btnDisabled]}
          onPress={handleChangePassword}
          disabled={savingPwd}
        >
          {savingPwd
            ? <ActivityIndicator color={colors.secondary} size="small" />
            : <>
                <Lock size={16} color={colors.secondary} />
                <Text style={[styles.btnText, { color: colors.secondary }]}>Modifier le mot de passe</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Déconnexion */}
      <View style={[styles.section, { marginTop: 8 }]}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  avatarSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  role: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  section: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 16,
  },

  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  fieldIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  fieldValueReadonly: { fontSize: 15, color: '#374151', fontWeight: '500' },

  inputGroup: { marginBottom: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  input: { flex: 1, fontSize: 15, color: '#111827' },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.secondary,
    borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  btnSecondary: {
    backgroundColor: '#EBF5FF',
    borderWidth: 1.5, borderColor: colors.secondary,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
