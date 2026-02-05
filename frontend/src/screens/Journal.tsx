import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Layout from '../components/common/Layout';

interface JournalScreenProps {
  navigation: any;
}

export default function JournalScreen({ navigation }: JournalScreenProps) {
  return (
    <Layout
      navigation={navigation}
      currentRoute="Journal"
      onNotificationPress={() => console.log('Notifications')}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Journal</Text>
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
