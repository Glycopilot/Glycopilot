// Fichier de test avec des erreurs volontaires
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BadComponent = () => {
  const [count] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('effet mal formaté');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={{ color: 'red', fontSize: 20, marginTop: 10 }}>
        Style inline mal formaté
      </Text>
      <Text>Compteur: {count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default BadComponent;
