// Fichier de test avec des erreurs volontaires
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BadComponent = () => {
  const [count,setCount]=useState(0);
  const unusedVariable="je ne sers à rien";
  
  useEffect(()=>{
    console.log("effet mal formaté");
  },[]);

  const badFunction = ()=>{
    return count+1;
  };

  return (
    <View style={styles.container}>
      <Text style={{color:'red',fontSize:20,marginTop:10}}>
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
