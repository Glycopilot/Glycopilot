// Jest setup file
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar'
}));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Expo modules
jest.mock('expo', () => ({
  AppLoading: 'AppLoading',
  useFonts: jest.fn(),
  SplashScreen: {
    preventAutoHideAsync: jest.fn(),
    hideAsync: jest.fn()
  }
}));
