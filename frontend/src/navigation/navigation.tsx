import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LoginScreen from '../screens/LogIn';
import SignInScreen from '../screens/SignIn';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import HomeScreen from '../screens/Home';
import StatsScreen from '../screens/Stats';
import ProfileScreen from '../screens/Profile';
import NotificationsScreen from '../screens/Notifications';
import JournalScreen from '../screens/Journal';
import MealsScreen from '../screens/meals';
import MedicationsScreen from '../screens/Medications';
import ActivitiesScreen from '../screens/Activities';
import GlycemiaScreen from '@/screens/Glycemia';
import SensorActivationScreen from '../screens/SensorActivation';
import PredictionsScreen from '../screens/Predictions';
import ProcheActivationScreen from '../screens/ProcheActivation';
import ProcheHomeScreen from '../screens/ProcheHome';
import ProcheGlycemiaScreen from '../screens/ProcheGlycemia';
import ProcheMedicationsScreen from '../screens/ProcheMedications';
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
  | 'SensorActivation'
  | 'Predictions'
  | 'ProcheActivation'
  | 'ProcheHome'
  | 'ProcheGlycemia'
  | 'ProcheMedications';

export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Login');
  const [prochePatientName, setProchePatientName] = useState<string | undefined>();

  useEffect(() => {
    setNavigate((screen: string, params?: Record<string, unknown>) => {
      if (params?.patientName) setProchePatientName(params.patientName as string);
      setCurrentScreen(screen as ScreenName);
    });
  }, []);

  const navigation = {
    navigate: (screen: string, params?: Record<string, unknown>) => {
      if (params?.patientName) setProchePatientName(params.patientName as string);
      setCurrentScreen(screen as ScreenName);
    },
    reset: ({ routes }: { index: number; routes: Array<{ name: string }> }) =>
      setCurrentScreen(routes[0].name as ScreenName),
  };

  // ─── Écrans auth ──────────────────────────────────────────────────────────

  if (currentScreen === 'Login') return <LoginScreen navigation={navigation} />;
  if (currentScreen === 'SignIn') return <SignInScreen navigation={navigation} />;

  // ─── Écran actif (patient ou proche) ──────────────────────────────────────

  let screen: React.ReactElement | null = null;

  if (currentScreen === 'Home') screen = <HomeScreen navigation={navigation} />;
  else if (currentScreen === 'Stats') screen = <StatsScreen navigation={navigation} />;
  else if (currentScreen === 'Profile') screen = <ProfileScreen navigation={navigation} />;
  else if (currentScreen === 'Notifications') screen = <NotificationsScreen navigation={navigation} />;
  else if (currentScreen === 'Journal') screen = <JournalScreen navigation={navigation} />;
  else if (currentScreen === 'Repas') screen = <MealsScreen navigation={navigation} />;
  else if (currentScreen === 'Traitements') screen = <MedicationsScreen navigation={navigation} />;
  else if (currentScreen === 'Activite') screen = <ActivitiesScreen navigation={navigation} />;
  else if (currentScreen === 'Glycemia') screen = <GlycemiaScreen navigation={navigation} />;
  else if (currentScreen === 'SensorActivation') screen = <SensorActivationScreen navigation={navigation} />;
  else if (currentScreen === 'Predictions') screen = <PredictionsScreen navigation={navigation} />;
  else if (currentScreen === 'ProcheActivation') screen = <ProcheActivationScreen navigation={navigation} />;
  else if (currentScreen === 'ProcheHome') screen = <ProcheHomeScreen navigation={navigation} />;
  else if (currentScreen === 'ProcheGlycemia') screen = <ProcheGlycemiaScreen navigation={navigation} patientName={prochePatientName} />;
  else if (currentScreen === 'ProcheMedications') screen = <ProcheMedicationsScreen navigation={navigation} />;
  else screen = <LoginScreen navigation={navigation} />;

  return (
    <View style={styles.root}>
      {screen}
      <OnboardingModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
