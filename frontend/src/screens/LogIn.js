import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useState } from 'react';
import { Mail, Lock } from 'lucide-react-native';
import authService from '../services/authService';
import CustomButton from '../components/common/CustomButton';
import Decorations from '../components/common/Decorations';
import { colors } from '../themes/colors';
import { toastError, toastSuccess } from '../services/toastService';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { height: windowHeight } = useWindowDimensions();

  const handleLogin = async () => {
    if (!email || !password) {
      toastError('Champs manquants', 'Veuillez remplir tous les champs.');
      return;
    }

    try {
      const result = await authService.login(email, password);
      toastSuccess('Connexion réussie', 'Bienvenue !');

      setEmail('');
      setPassword('');

      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      toastError('Erreur de connexion', error.message);
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
