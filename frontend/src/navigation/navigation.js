import React, { useState } from 'react';
import LoginScreen from '../screens/LogIn';
import SignInScreen from '../screens/SignIn';
import HomeScreen from '../screens/Home';

export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState('Login');

  const navigation = {
    navigate: screen => setCurrentScreen(screen),
    reset: ({ routes }) => setCurrentScreen(routes[0].name),
  };

  if (currentScreen === 'Login') {
    return <LoginScreen navigation={navigation} />;
  }
  if (currentScreen === 'SignIn') {
    return <SignInScreen navigation={navigation} />;
  }
  if (currentScreen === 'Home') {
    return <HomeScreen navigation={navigation} />;
  }
}
