import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  useWindowDimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import authService from '../services/authService';
import CustomButton from '../components/common/CustomButton';
import InputField from '../components/common/InputField';
import Decorations from '../components/common/Decorations';
import { colors } from '../themes/colors';
import { toastError, toastSuccess } from '../services/toastService';

export default function SignInScreen({ navigation }) {
  const [firstName, setfirstName] = useState('');
  const [lastName, setlastName] = useState('');

  const [email, setEmail] = useState('');
  const [Confirmationemail, setConfirmationEmail] = useState('');

  const [password, setPassword] = useState('');
  const [ConfirmationPassword, setConfirmationPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { height: windowHeight } = useWindowDimensions();

  const handleSingIn = async () => {
    // basic presence checks for names
    if (!firstName || !lastName) {
      toastError('Erreur', 'Veuillez fournir le nom et le prénom');
      return;
    }
    if (Confirmationemail !== email) {
      toastError('Erreur', 'Les emails ne correspondent pas');
      return;
    }
    if (ConfirmationPassword !== password) {
      toastError('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (!email || !password) {
      toastError('Erreur', 'Veuillez remplir tous les champs');
      return;
    } else if (password.length < 8) {
      toastError(
        'Erreur',
        'Le mot de passe doit contenir au moins 8 caractères'
      );
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      toastError('Erreur', "L'adresse email n'est pas valide");
      return;
    } else if (!/\d/.test(password)) {
      toastError('Erreur', 'Le mot de passe doit contenir au moins un chiffre');
      return;
    } else if (!/[A-Z]/.test(password)) {
      toastError(
        'Erreur',
        'Le mot de passe doit contenir au moins une lettre majuscule'
      );
      return;
    } else {
      try {
        await authService.register({
          email,
          firstName,
          lastName,
          password,
          passwordConfirm: ConfirmationPassword,
        });
        toastSuccess('Inscription réussie!', 'Bienvenue !');

        // Vider le formulaire
        setEmail('');
        setfirstName('');
        setlastName('');
        setPassword('');
        setConfirmationPassword('');
        setConfirmationEmail('');

        // Rediriger vers l'écran d'accueil
        if (navigation && navigation.reset) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } else if (navigation && navigation.navigate) {
          navigation.navigate('Login');
        }
      } catch (error) {
        toastError('Erreur inscription', error.message);
      }
    }
  };

  return (
    <View style={[styles.container, { minHeight: windowHeight }]}>
      {/* Header */}
      <View style={styles.header}>
        <Decorations />
        <Text
          style={{
            marginTop: 40,
            color: colors.primary,
            backgroundColor: colors.lightBg,
            padding: 10,
            borderRadius: 10,
          }}
          onPress={() => navigation.navigate('Login')}
        >
          Avez vous compte ? Connectez-vous
        </Text>

        {/* Logo */}
        <Image
          source={require('../../assets/glycopilot.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        style={styles.formContainer}
      >
        <View style={styles.form}>
          <View style={styles.rowContainer}>
            <View style={styles.halfWidth}>
              <InputField
                label="Nom"
                value={lastName}
                onChangeText={setlastName}
                placeholder="Nom"
              />
            </View>

            <View style={styles.halfWidth}>
              <InputField
                label="Prénom"
                value={firstName}
                onChangeText={setfirstName}
                placeholder="Prénom"
              />
            </View>
          </View>

          {/* EMAIL */}
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            icon={<Mail size={20} color="#666" />}
            placeholder="user@example.com"
            keyboardType="email-address"
          />

          <InputField
            label="Confirmation d'email"
            value={Confirmationemail}
            onChangeText={setConfirmationEmail}
            icon={<Mail size={20} color="#666" />}
            placeholder="user@example.com"
            keyboardType="email-address"
          />

          {/* PASSWORD */}
          <InputField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            icon={<Lock size={20} color="#666" />}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color="#666" />
                ) : (
                  <Eye size={20} color="#666" />
                )}
              </TouchableOpacity>
            }
          />

          <InputField
            label="Confirmation du mot de passe"
            value={ConfirmationPassword}
            onChangeText={setConfirmationPassword}
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

          <CustomButton title="S'inscrire" onPress={handleSingIn} />
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundColor,
    flex: 1,
  },

  header: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 20,
  },

  formContainer: {
    flex: 1,
  },

  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
    paddingBottom: 400,
  },

  logo: {
    width: 200,
    height: 150,
  },

  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },

  form: {
    width: '85%',
    maxWidth: 380,
  },

  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },

  halfWidth: {
    flex: 1,
  },
});
