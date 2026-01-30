import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import authService from '../services/authService';
import passwordService from '../services/passwordService';
import CustomButton from '../components/common/CustomButton';
import InputField from '../components/common/InputField';
import Decorations from '../components/common/Decorations';
import { colors } from '../themes/colors';
import { toastError, toastSuccess } from '../services/toastService';
import type { NavigationProps } from '../types/components.types';

interface LoginScreenProps {
  navigation: NavigationProps;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { height: windowHeight } = useWindowDimensions();

  const handleLogin = async () => {
    if (!email || !password) {
      toastError('Champs manquants', 'Veuillez remplir tous les champs.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.login(email, password);
      toastSuccess('Connexion réussie', 'Bienvenue !');
      setEmail('');
      setPassword('');
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      const err = error as Error;
      toastError('Erreur de connexion', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toastError('Email manquant', 'Veuillez entrer votre email.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      toastError('Email invalide', "L'adresse email n'est pas valide");
      return;
    }

    setIsLoading(true);
    try {
      await passwordService.requestPasswordReset(resetEmail);
      toastSuccess(
        'Email envoyé',
        'Vérifiez votre email pour réinitialiser votre mot de passe'
      );
      setResetEmail('');
      setIsPasswordResetMode(false);
    } catch (error) {
      const err = error as Error;
      toastError('Erreur', err.message);
    } finally {
      setIsLoading(false);
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
        {!isPasswordResetMode ? (
          <>
            {/* EMAIL */}
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={20} color="#666" />}
              placeholder="user@example.com"
              keyboardType="email-address"
              autoCorrect={false}
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
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#666" />
                  ) : (
                    <Eye size={20} color="#666" />
                  )}
                </TouchableOpacity>
              }
            />

            <Text
              style={{
                marginTop: 12,
                marginBottom: 20,
                color: colors.primaryDark,
                textAlign: 'right',
                fontWeight: '500',
              }}
              onPress={() => setIsPasswordResetMode(true)}
            >
              Mot de passe oublié ?
            </Text>

            <CustomButton
              title="Se connecter"
              onPress={handleLogin}
              disabled={isLoading}
              loading={isLoading}
            />
          </>
        ) : (
          <>
            {/* PASSWORD RESET FORM */}
            <InputField
              label="Votre email"
              value={resetEmail}
              onChangeText={setResetEmail}
              icon={<Mail size={20} color="#666" />}
              placeholder="user@example.com"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <Text
              style={{
                marginTop: 8,
                marginBottom: 20,
                fontSize: 12,
                color: colors.textSecondary,
              }}
            >
              Un lien de réinitialisation sera envoyé à votre email
            </Text>

            <CustomButton
              title="Envoyer le lien"
              onPress={handlePasswordReset}
              disabled={isLoading}
              loading={isLoading}
            />

            <TouchableOpacity
              onPress={() => {
                setIsPasswordResetMode(false);
                setResetEmail('');
              }}
              style={{ marginTop: 12 }}
            >
              <Text
                style={{
                  color: colors.primaryDark,
                  textAlign: 'center',
                  fontWeight: '500',
                }}
              >
                Retour
              </Text>
            </TouchableOpacity>
          </>
        )}
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
});
