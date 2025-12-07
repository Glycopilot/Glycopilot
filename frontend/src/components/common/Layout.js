import React from 'react';
import { View, StyleSheet } from 'react-native';
import Header from './Header';
import Navbar from './Navbar';

/**
 * Composant Layout - Enveloppe commune avec Header et Navbar
 * @param {React.ReactNode} children - Contenu de la page
 * @param {Object} navigation - Objet de navigation
 * @param {string} currentRoute - Route actuelle pour Navbar active tab
 * @param {string} userName - Nom de l'utilisateur pour Header
 * @param {string} userImage - Image de l'utilisateur
 * @param {function} onNotificationPress - Callback pour notifications
 */
export default function Layout({
  children,
  navigation,
  currentRoute = 'Home',
  userName = 'Utilisateur',
  userImage,
  onNotificationPress,
}) {
  return (
    <View style={styles.container}>
      <Header
        userName={userName}
        userImage={userImage}
        onNotificationPress={
          onNotificationPress || (() => console.log('Notifications'))
        }
        navigation={navigation}
      />

      <View style={styles.content}>{children}</View>

      <Navbar navigation={navigation} currentRoute={currentRoute} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    flex: 1,
  },
});
