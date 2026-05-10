import React, { useEffect, useRef } from 'react';
import AppNavigator from './src/navigation/navigation';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { navigate } from './src/navigation/navigationRef';
import { startLibre2Background } from './src/services/libre2BackgroundService';

export default function App() {
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);

  // Surveillance Libre 2 au niveau app — tourne pour toute la durée de vie
  // de l'app, indépendamment de l'écran courant.
  useEffect(() => {
    startLibre2Background();
  }, []);

  useEffect(() => {
    // Listener quand une notification est reçue (app au premier plan)
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

    // Listener quand l'utilisateur tape sur une notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification tapped:', response);
        navigate('Notifications');
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <>
      <AppNavigator />
      <Toast onPress={() => navigate('Notifications')} />
      <StatusBar style="auto" />
    </>
  );
}
