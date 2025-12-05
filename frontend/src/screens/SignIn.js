import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Image,
  useWindowDimensions,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { Mail, Lock } from 'lucide-react-native';
import authService from '../services/authService';
import CustomButton from '../components/common/CustomButton';
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
        const result = await authService.register({
          email,
          firstName,
          lastName,
          password,
          passwordConfirm: ConfirmationPassword,
        });
        toastSuccess('Inscription réussie!', 'Bienvenue !');
        console.log('Utilisateur ajouté:', result.user);

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
    <View
      style={[styles.container, { minHeight: windowHeight }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Decorations />
        <Text
          style={{
            marginTop: 20,
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
            <View style={[styles.inputWrapper, styles.halfWidth]}>
              <Text style={styles.label}>Nom</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setlastName}
                />
              </View>
            </View>

            <View style={[styles.inputWrapper, styles.halfWidth]}>
              <Text style={styles.label}>Prénom</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setfirstName}
                />
              </View>
            </View>
          </View>

          {/* EMAIL */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}> Confirmation d'email</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={Confirmationemail}
                onChangeText={setConfirmationEmail}
              />
            </View>
          </View>
          {/* PASSWORD */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputContainer}>
              <Lock size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={password}
                secureTextEntry={true}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Confirmation du mot de passe</Text>
            <View style={styles.inputContainer}>
              <Lock size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={ConfirmationPassword}
                secureTextEntry={true}
                onChangeText={setConfirmationPassword}
              />
            </View>
          </View>

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
    marginBottom: 0,
  },

  inputWrapper: {
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.backgroundColor,
    paddingHorizontal: 12,
    height: 50,
  },

  icon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
    outlineColor: colors.transparent,
  },
});