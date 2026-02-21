import React, { useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  Linking,
  Button,
  StyleSheet,
} from 'react-native';
import dexcomService from '../services/dexcomService';

type Props = {
  navigation: {
    navigate: (screen: string) => void;
  };
};

const DexcomConnect: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const authorizeUrl = await dexcomService.getAuthorizeUrl();

      if (!authorizeUrl) {
        throw new Error('URL Dexcom non reçue du backend');
      }

      try {
        await Linking.openURL(authorizeUrl);
        } catch {
        throw new Error("Impossible d’ouvrir l’URL Dexcom sur cet appareil");
        }
    } catch (error: any) {
      console.error('Dexcom connect error:', error);
      Alert.alert('Erreur', error?.message ?? 'Impossible de connecter Dexcom');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connecter Dexcom</Text>

      <Text style={styles.subtitle}>
        Vous allez être redirigé vers Dexcom pour autoriser GlycoPilot à accéder à vos données de glycémie.
      </Text>

      <View style={{ height: 16 }} />

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Continuer avec Dexcom" onPress={handleConnect} />
      )}

      <View style={{ height: 16 }} />

      <Button title="Retour" onPress={() => navigation.navigate('Home')} />
    </View>
  );
};

export default DexcomConnect;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 20,
    lineHeight: 20,
  },
});