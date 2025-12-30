import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  useWindowDimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import passwordService from '../services/passwordService';
import CustomButton from '../components/common/CustomButton';
import InputField from '../components/common/InputField';
import Decorations from '../components/common/Decorations';
import { colors } from '../themes/colors';
import { toastError, toastSuccess } from '../services/toastService';

export default function ResetPasswordScreen({ route, navigation }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { height: windowHeight } = useWindowDimensions();

  // Récupérer le token depuis les paramètres
  const token = route?.params?.token || '';

  // Évaluer la force du mot de passe
  const evaluatePasswordStrength = password => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        toastError(
          'Erreur',
          'Token manquant. Vérifiez le lien reçu par email.'
        );
        setIsValidatingToken(false);
        return;
      }

      try {
        await passwordService.validatePasswordResetToken(token);
        setIsTokenValid(true);
      } catch (error) {
        toastError('Token invalide', error.message);
        setIsTokenValid(false);
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const validateForm = () => {
    if (!newPassword || !confirmPassword) {
      toastError('Champs manquants', 'Veuillez remplir tous les champs.');
      return false;
    }

    if (newPassword.length < 8) {
      toastError(
        'Mot de passe faible',
        'Le mot de passe doit contenir au moins 8 caractères'
      );
      return false;
    }

    if (!/\d/.test(newPassword)) {
      toastError(
        'Mot de passe faible',
        'Le mot de passe doit contenir au moins un chiffre'
      );
      return false;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toastError(
        'Mot de passe faible',
        'Le mot de passe doit contenir au moins une lettre majuscule'
      );
      return false;
    }

    if (newPassword !== confirmPassword) {
      toastError('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await passwordService.confirmPasswordReset(token, newPassword);
      toastSuccess(
        'Succès!',
        'Votre mot de passe a été réinitialisé avec succès'
      );
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toastError('Erreur', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Affichage pendant la validation du token
  if (isValidatingToken) {
    return (
      <View style={[styles.container, { minHeight: windowHeight }]}>
        <Decorations />
        <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
          Vérification du lien...
        </Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Token invalide
  if (!isTokenValid) {
    return (
      <View style={[styles.container, { minHeight: windowHeight }]}>
        <Decorations />
        <View style={styles.errorContainer}>
          <AlertCircle size={50} color={colors.error} />
          <Text style={styles.errorTitle}>Lien expiré ou invalide</Text>
          <Text style={styles.errorMessage}>
            Le lien de réinitialisation est expiré ou invalide. Veuillez en
            demander un nouveau.
          </Text>
          <CustomButton
            title="Demander un nouveau lien"
            onPress={() => {
              if (navigation && navigation.reset) {
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              }
            }}
          />
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { minHeight: windowHeight }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Decorations />

        {/* Logo */}
        <Image
          source={require('../../assets/glycopilot.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* === TITRE === */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Réinitialiser votre mot de passe</Text>
        </View>

        {/* === FORMULAIRE === */}
        <View style={styles.form}>
          {/* NOUVEAU MOT DE PASSE */}
          <InputField
            label="Nouveau mot de passe"
            value={newPassword}
            onChangeText={text => {
              setNewPassword(text);
              evaluatePasswordStrength(text);
            }}
            icon={<Lock size={20} color="#666" />}
            secureTextEntry={!showNewPassword}
            placeholder="••••••••"
            rightElement={
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff size={20} color="#666" />
                ) : (
                  <Eye size={20} color="#666" />
                )}
              </TouchableOpacity>
            }
          />

          {/* Password Strength Indicator */}
          {newPassword && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4, 5].map(level => (
                  <View
                    key={level}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          level <= passwordStrength
                            ? getStrengthColor(passwordStrength)
                            : '#e0e0e0',
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.strengthText}>
                Force: {getStrengthLabel(passwordStrength)}
              </Text>
            </View>
          )}

          {/* CONFIRMATION MOT DE PASSE */}
          <InputField
            label="Confirmer le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            icon={<Lock size={20} color="#666" />}
            secureTextEntry={!showConfirmPassword}
            placeholder="••••••••"
            rightElement={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#666" />
                ) : (
                  <Eye size={20} color="#666" />
                )}
              </TouchableOpacity>
            }
          />

          {/* REQUIREMENTS */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Exigences:</Text>
            <RequirementItem
              met={newPassword.length >= 8}
              text="Au moins 8 caractères"
            />
            <RequirementItem
              met={/[A-Z]/.test(newPassword)}
              text="Au moins une lettre majuscule"
            />
            <RequirementItem
              met={/\d/.test(newPassword)}
              text="Au moins un chiffre"
            />
            <RequirementItem
              met={newPassword === confirmPassword && confirmPassword !== ''}
              text="Les mots de passe correspondent"
            />
          </View>

          <CustomButton
            title="Réinitialiser le mot de passe"
            onPress={handleResetPassword}
            disabled={isLoading || !isTokenValid}
          />
        </View>
      </ScrollView>

      <StatusBar style="auto" />
    </View>
  );
}

// Composant pour afficher les exigences
function RequirementItem({ met, text }) {
  return (
    <View style={styles.requirementItem}>
      <View
        style={[
          styles.requirementDot,
          { backgroundColor: met ? colors.success : '#ccc' },
        ]}
      />
      <Text
        style={[
          styles.requirementText,
          { color: met ? colors.textPrimary : '#999' },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// Fonction pour obtenir la couleur en fonction de la force du mot de passe
function getStrengthColor(strength) {
  if (strength <= 1) return '#ff6b6b';
  if (strength <= 2) return '#ffa500';
  if (strength <= 3) return '#ffc107';
  if (strength <= 4) return '#8bc34a';
  return '#4caf50';
}

// Fonction pour obtenir le label de force
function getStrengthLabel(strength) {
  if (strength <= 1) return 'Très faible';
  if (strength <= 2) return 'Faible';
  if (strength <= 3) return 'Moyen';
  if (strength <= 4) return 'Fort';
  return 'Très fort';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundColor,
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
    margin: 0,
    padding: 0,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
    width: '100%',
  },
  logo: {
    width: 180,
    height: 130,
    marginBottom: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  form: {
    width: '85%',
    maxWidth: 380,
  },
  strengthContainer: {
    marginTop: 10,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  requirementsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  requirementText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 30,
    width: '100%',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
    marginTop: 15,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
});
