import React from 'react';
import AppNavigator from './src/navigation/navigation';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <>
      <AppNavigator />
      <Toast />
      <StatusBar style="auto" />
    </>
  );
}
