import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import authService from '../services/authService';
import Layout from '../components/common/Layout';

export default function StatsScreen({ navigation }) {
  return (
    <Layout
      navigation={navigation}
      currentRoute="Stats"
      userName="Utilisateur"
      onNotificationPress={() => console.log('Notifications')}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Stats </Text>
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
});
