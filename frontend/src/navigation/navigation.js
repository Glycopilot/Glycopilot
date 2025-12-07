import React, { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import LoginScreen from '../screens/LogIn';
import SignInScreen from '../screens/SignIn';
import ResetPasswordScreen from '../screens/ResetPassword';
import HomeScreen from '../screens/Home';
import JournalScreen from '../screens/Journal';
import StatsScreen from '../screens/Stats';
import ProfileScreen from '../screens/Profile';
import NotificationScreen from '../screens/Notifications';

export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [resetToken, setResetToken] = useState(null);

  const navigation = {
    navigate: screen => setCurrentScreen(screen),
    reset: ({ routes }) => setCurrentScreen(routes[0].name),
  };

  // Gérer les deep links (liens des emails)
  useEffect(() => {
    const handleDeepLink = ({ url }) => {
      // Parse le URL pour extraire le token
      if (url.includes('reset-password')) {
        const tokenMatch = url.match(/token=([^&]+)/);
        if (tokenMatch && tokenMatch[1]) {
          setResetToken(tokenMatch[1]);
          setCurrentScreen('ResetPassword');
        }
      }
    };

    // Listener pour les deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Vérifier si l'app a été ouverte avec un deep link
    Linking.getInitialURL().then(url => {
      if (url != null) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (currentScreen === 'Login') {
    return <LoginScreen navigation={navigation} />;
  }
  if (currentScreen === 'SignIn') {
    return <SignInScreen navigation={navigation} />;
  }
  if (currentScreen === 'ResetPassword') {
    return (
      <ResetPasswordScreen
        navigation={navigation}
        route={{ params: { token: resetToken } }}
      />
    );
  }
  if (currentScreen === 'Home') {
    return <HomeScreen navigation={navigation} />;
  }
  if (currentScreen === 'Journal') {
    return <JournalScreen navigation={navigation} />;
  }
  if (currentScreen === 'Stats') {
    return <StatsScreen navigation={navigation} />;
  }
  if (currentScreen === 'Profile') {
    return <ProfileScreen navigation={navigation} />;
  }
  if (currentScreen === 'Notifications') {
    return <NotificationScreen navigation={navigation} />;
  }

  return null;
}
