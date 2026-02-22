import React, { useState, useEffect } from 'react';
import LoginScreen from '../screens/LogIn';
import SignInScreen from '../screens/SignIn';
import HomeScreen from '../screens/Home';
import StatsScreen from '../screens/Stats';
import ProfileScreen from '../screens/Profile';
import NotificationsScreen from '../screens/Notifications';
import JournalScreen from '../screens/Journal';
import MealsScreen from '../screens/meals';
import MedicationsScreen from '../screens/medicins';
import ActivitiesScreen from '../screens/Activities';
import GlycemiaScreen from '@/screens/Glycemia';
import { setNavigate } from './navigationRef';

type ScreenName =
  | 'Login'
  | 'SignIn'
  | 'Home'
  | 'Stats'
  | 'Profile'
  | 'Notifications'
  | 'Journal'
  | 'Repas'
  | 'Traitements'
  | 'Activite'
  | 'Glycemia'
  | 'Test';
export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Login');

  useEffect(() => {
    setNavigate((screen: string) => setCurrentScreen(screen as ScreenName));
  }, []);

  const navigation = {
    navigate: (screen: string) => setCurrentScreen(screen as ScreenName),
    reset: ({ routes }: { index: number; routes: Array<{ name: string }> }) =>
      setCurrentScreen(routes[0].name as ScreenName),
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
  if (currentScreen === 'Stats') {
    return <StatsScreen navigation={navigation} />;
  }
  if (currentScreen === 'Profile') {
    return <ProfileScreen navigation={navigation} />;
  }
  if (currentScreen === 'Notifications') {
    return <NotificationsScreen navigation={navigation} />;
  }
  if (currentScreen === 'Journal') {
    return <JournalScreen navigation={navigation} />;
  }
  if (currentScreen === 'Repas') {
    return <MealsScreen navigation={navigation} />;
  }
  if (currentScreen === 'Traitements') {
    return <MedicationsScreen navigation={navigation} />;
  }
  if (currentScreen === 'Activite') {
    return <ActivitiesScreen navigation={navigation} />;
  }
  if (currentScreen === 'Glycemia') {
    return <GlycemiaScreen navigation={navigation} />;
  }

  return <LoginScreen navigation={navigation} />;
}
