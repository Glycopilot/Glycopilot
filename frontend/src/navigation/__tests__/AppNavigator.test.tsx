import React from 'react';
import { render, act } from '@testing-library/react-native';
import AppNavigator from '../navigation';
import { setNavigate } from '../navigationRef';

// Mock all screens to avoid deep rendering issues
jest.mock('../../screens/LogIn', () => (props: any) => null);
jest.mock('../../screens/SignIn', () => (props: any) => null);
jest.mock('../../screens/Home', () => (props: any) => null);
jest.mock('../../screens/Stats', () => (props: any) => null);
jest.mock('../../screens/Profile', () => (props: any) => null);
jest.mock('../../screens/Notifications', () => (props: any) => null);
jest.mock('../../screens/Journal', () => (props: any) => null);
jest.mock('../../screens/meals', () => (props: any) => null);

jest.mock('../../screens/Activities', () => (props: any) => null);
jest.mock('@/screens/Glycemia', () => (props: any) => null);

let capturedNavigate: any;
jest.mock('../navigationRef', () => ({
    setNavigate: (fn: any) => { capturedNavigate = fn; }
}));

describe('AppNavigator', () => {
    it('renders and allows navigation to all screens', async () => {
        const { rerender } = render(<AppNavigator />);

        const screens = [
            'Login', 'SignIn', 'Home', 'Stats', 'Profile', 
            'Notifications', 'Journal', 'Repas', 'Traitements', 
            'Activite', 'Glycemia', 'Unknown'
        ];

        for (const screen of screens) {
            await act(async () => {
                if (capturedNavigate) {
                    capturedNavigate(screen);
                }
            });
        }
    });
});
