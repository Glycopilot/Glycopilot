import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import authService from '../services/authService';
import Layout from '../components/common/Layout';

export default function ProfileScreen({ navigation }) {
  return (
    <Layout
      navigation={navigation}
      currentRoute="Profile"
      userName="Utilisateur"
      onNotificationPress={() => console.log('Notifications')}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Profile </Text>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
});
