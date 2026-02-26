import * as ReactNative from 'react-native';

// Mock expo-modules-core BEFORE anything else
jest.mock('expo-modules-core', () => {
    const { EventEmitter } = require('events');
    return {
        requireNativeModule: jest.fn().mockReturnValue({}),
        requireOptionalNativeModule: jest.fn().mockReturnValue({}),
        EventEmitter: EventEmitter,
        NativeModulesProxy: {},
        ProxyNativeModule: {},
        SharedObject: class { },
        SharedRef: class { },
    };
});

// Set environment variables for tests
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';
process.env.EXPO_PUBLIC_API_TIMEOUT = '5000';

// Mock NativeModules
jest.doMock('react-native/Libraries/BatchedBridge/NativeModules', () => {
    const NativeModules = {
        UIManager: {
            customBubblingEventTypes: {},
            customDirectEventTypes: {},
            Dimensions: {
                window: { width: 375, height: 812, scale: 3, fontScale: 1 },
                screen: { width: 375, height: 812, scale: 3, fontScale: 1 },
            },
        },
        NativeUnimoduleProxy: {
            viewManagersMetadata: {},
        },
        DeviceEventManager: {
            addListener: jest.fn(),
            removeListeners: jest.fn(),
        },
        PlatformConstants: {
            forceTouchAvailable: false,
        },
        RNGestureHandlerModule: {
            State: {},
            install: jest.fn(),
        },
        RNOSModule: {
            getSystemName: jest.fn(),
        }
    };
    return NativeModules;
}, { virtual: true });

// Basic mocks for Expo modules that are commonly used
jest.mock('expo-constants', () => ({
    expoConfig: {
        extra: {
            eas: { projectId: 'test-project-id' }
        }
    },
    manifest: {},
    installationId: 'test-installation-id',
}));

jest.mock('expo-device', () => ({
    isDevice: true,
    brand: 'Apple',
    modelName: 'iPhone',
}));

jest.mock('expo-notifications', () => ({
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getExpoPushTokenAsync: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
    addNotificationReceivedListener: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn(),
    removeNotificationSubscription: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-print', () => ({
    printToFileAsync: jest.fn().mockResolvedValue({ uri: 'test.pdf' }),
    selectPrinterAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
    notificationAsync: jest.fn(),
    impactAsync: jest.fn(),
    selectionAsync: jest.fn(),
    NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
    ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));

jest.mock('expo-asset', () => ({
    Asset: {
        fromModule: jest.fn().mockReturnValue({ downloadAsync: jest.fn(), localUri: 'test' }),
    },
}));

jest.mock('expo-font', () => ({
    isLoaded: jest.fn().mockReturnValue(true),
    loadAsync: jest.fn().mockResolvedValue(null),
}));

// Ensure global NativeModules is also patched
if (!ReactNative.NativeModules.UIManager) {
    ReactNative.NativeModules.UIManager = {};
}

// Add other global mocks
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(null),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(null),
    multiRemove: jest.fn().mockResolvedValue(null),
    multiMerge: jest.fn().mockResolvedValue(null),
}));

jest.mock('lucide-react-native', () => {
    const React = require('react');
    const { View } = require('react-native');
    const mockIcon = (name) => (props) => React.createElement(View, { ...props, testID: name });

    return new Proxy({}, {
        get: (target, property) => {
            if (typeof property === 'string') {
                return mockIcon(property);
            }
            return target[property];
        }
    });
});
