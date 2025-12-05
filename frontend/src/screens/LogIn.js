import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { Mail, Lock } from 'lucide-react-native';
import authService from '../services/authService';
import CustomButton from '../components/common/CustomButton';
import Decorations from '../components/common/Decorations';
import { colors } from '../themes/colors';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { height: windowHeight } = useWindowDimensions();

  const handleLogin = async () => {
    // Validation basique
    if (!email || !password) {
      setMessage('Erreur Veuillez remplir tous les champs');
      return;
    }

    setMessage('');

    try {
      const result = await authService.login(email, password);
      // Vider le formulaire
      setEmail('');
      setPassword('');

      // Rediriger vers l'écran d'accueil
      if (navigation && navigation.reset) {
        // reset stack so user can't go back to login
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else if (navigation && navigation.navigate) {
        navigation.navigate('Home');
      }
    } catch (error) {
      setMessage(`✗ ${error.message}`);
      Alert.alert('Erreur de connexion', error.message);
    }
  };

  return (
    <View style={[styles.container, { minHeight: windowHeight }]}>
      <Decorations />
      {/* Logo */}
      <Image
        source={require('../../assets/glycopilot.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {/* === FORMULAIRE === */}
      <View style={styles.form}>
        {/* EMAIL */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Mail size={20} color="#666" />
            <TextInput
              style={styles.input}
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* PASSWORD */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.inputContainer}>
            <Lock size={20} color="#666" />
            <TextInput
              style={styles.input}
              value={password}
              secureTextEntry={true}
              onChangeText={setPassword}
            />
          </View>
        </View>
        <CustomButton title="Se connecter" onPress={handleLogin} />
      </View>
      <Text
        style={{
          marginTop: 20,
          color: colors.primaryDark,
          backgroundColor: colors.lightBg,
          padding: 10,
          borderRadius: 10,
        }}
        onPress={() => navigation.navigate('SignIn')}
      >
        Pas encore de compte ? Inscrivez-vous
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 30,
  },

  logo: {
    width: 200,
    height: 150,
  },

  message: {
    fontSize: 16,
    color: colors.errorRed,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },

  form: {
    width: '85%',
    maxWidth: 380,
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
  },
});
