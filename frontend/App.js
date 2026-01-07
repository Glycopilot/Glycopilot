import React from 'react';
import AppNavigator from './src/navigation/navigation';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
      <Toast style={{ topOffset: 50, zIndex: 9999 }} />
    </>
  );
}
