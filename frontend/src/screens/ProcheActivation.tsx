import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ShieldCheck, Mail } from 'lucide-react-native';
import { colors } from '../themes/colors';
import procheService from '../services/procheService';
import { toastError, toastSuccess } from '../services/toastService';

interface Props {
  navigation: { navigate: (s: string) => void };
}

const CODE_LENGTH = 6;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export default function ProcheActivation({ navigation }: Readonly<Props>) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [codeChars, setCodeChars] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validatedCode, setValidatedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>(Array(CODE_LENGTH).fill(null));

  const handleCodeChange = useCallback(
    (text: string, index: number) => {
      const char = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
      const newChars = [...codeChars];
      newChars[index] = char;
      setCodeChars(newChars);
      if (char && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [codeChars]
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !codeChars[index] && index > 0) {
        const newChars = [...codeChars];
        newChars[index - 1] = '';
        setCodeChars(newChars);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [codeChars]
  );

  const handleValidate = async () => {
    const code = codeChars.join('');
    if (!email.trim()) {
      toastError('Email manquant', 'Entrez votre adresse email.');
      return;
    }
    if (code.length < CODE_LENGTH || codeChars.some(c => !c)) {
      toastError('Code incomplet', 'Entrez les 6 caractères du code.');
      return;
    }
    setLoading(true);
    try {
      await procheService.validateCode(email.trim().toLowerCase(), code);
      setValidatedCode(code);
      toastSuccess('Code validé !', 'Choisissez maintenant votre mot de passe.');
      setStep(2);
    } catch {
      toastError('Code invalide', 'Vérifiez le code ou contactez le patient.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (password.length < 8) {
      toastError('Mot de passe trop court', 'Minimum 8 caractères.');
      return;
    }
    if (password !== confirm) {
      toastError('Confirmation incorrecte', 'Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await procheService.activateAccount(email.trim().toLowerCase(), validatedCode, password);
      toastSuccess('Compte activé !', 'Connectez-vous maintenant.');
      navigation.navigate('Login');
    } catch {
      toastError('Erreur', "Impossible d'activer le compte. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconBox}>
          <ShieldCheck size={48} color="#007AFF" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Activer votre accès proche</Text>

        {step === 1 ? (
          <>
            <Text style={styles.subtitle}>
              Entrez l'email sur lequel vous avez reçu l'invitation et le code à 6 caractères.
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.emailRow}>
                <Mail size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.emailInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="votre@email.fr"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={[styles.label, { marginTop: 24 }]}>Code d'activation</Text>
              <View style={styles.codeRow}>
                {codeChars.map((char, i) => (
                  <TextInput
                    key={String(i)}
                    ref={ref => {
                      inputRefs.current[i] = ref;
                    }}
                    style={[styles.codeBox, char ? styles.codeBoxFilled : null]}
                    value={char}
                    onChangeText={text => handleCodeChange(text, i)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                    maxLength={2}
                    autoCapitalize="characters"
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleValidate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Valider le code</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Code validé. Choisissez un mot de passe pour votre compte {email}.
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 8 caractères"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />

              <Text style={[styles.label, { marginTop: 12 }]}>Confirmer le mot de passe</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Répétez le mot de passe"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleActivate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Activer mon compte</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={{ marginTop: 24 }}
        >
          <Text style={styles.back}>← Retour à la connexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  codeBox: {
    width: 46,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: '#fff',
  },
  codeBoxFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#EBF5FF',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: '#fff',
  },
  btn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  back: {
    textAlign: 'center',
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
