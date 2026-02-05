import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Layout from '../components/common/Layout';

interface NotificationsScreenProps {
  navigation: any;
}

export default function NotificationsScreen({
  navigation,
}: NotificationsScreenProps) {
  return (
    <Layout
      navigation={navigation}
      currentRoute="Notifications"
      onNotificationPress={() => console.log('Notifications')}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Notifications</Text>
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
