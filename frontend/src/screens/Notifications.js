import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import authService from '../services/authService';
import Layout from '../components/common/Layout';

export default function NotificationScreen({ navigation }) {
  return (
    <Layout
      navigation={navigation}
      currentRoute="Notifications"
      onNotificationPress={() => console.log('Notifications')}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Notifications </Text>
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

  actions: {
    width: '100%',
    maxWidth: 320,
  },
});
