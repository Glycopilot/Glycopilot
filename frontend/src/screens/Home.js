import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import authService from '../services/authService';

export default function HomeScreen({ navigation }) {
  const handleLogout = async () => {
    try {
      await authService.logout();
      // Reset navigation to Login
      if (navigation && navigation.reset) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
      console.warn('Logout error', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue </Text>
      <Text style={styles.subtitle}>Vous êtes connecté.</Text>
      <View style={styles.actions}>
        <Button
          title="Se déconnecter"
          onPress={handleLogout}
          color="#f66560ff"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
  },
});
