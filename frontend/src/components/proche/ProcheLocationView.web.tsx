import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProcheLocationView() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        La carte n'est pas disponible sur la version web.
        Utilisez l'application mobile pour accéder à cette fonctionnalité.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  text: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});