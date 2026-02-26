import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { showToast, toastSuccess, toastError, toastInfo } from '../toastService';

jest.mock('react-native-toast-message', () => ({
    show: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
    notificationAsync: jest.fn(),
    impactAsync: jest.fn(),
    NotificationFeedbackType: {
        Success: 'success',
        Error: 'error',
    },
    ImpactFeedbackStyle: {
        Light: 'light',
    },
}));

describe('toastService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('showToast', () => {
        it('should show success toast with haptic feedback', async () => {
            await showToast('success', 'Title', 'Message');

            expect(Toast.show).toHaveBeenCalledWith({
                type: 'success',
                text1: 'Title',
                text2: 'Message',
                visibilityTime: 3000,
            });
            expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
        });

        it('should show error toast with haptic feedback', async () => {
            await showToast('error', 'Error Title', 'Error Message');

            expect(Toast.show).toHaveBeenCalledWith({
                type: 'error',
                text1: 'Error Title',
                text2: 'Error Message',
                visibilityTime: 3000,
            });
            expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
        });

        it('should show info toast with light impact haptic', async () => {
            await showToast('info', 'Info', 'Info message');

            expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
        });

        it('should show toast without haptic if disabled', async () => {
            await showToast('success', 'Title', '', 3000, false);

            expect(Haptics.notificationAsync).not.toHaveBeenCalled();
            expect(Toast.show).toHaveBeenCalled();
        });

        it('should not crash if haptics fail', async () => {
            (Haptics.notificationAsync as jest.Mock).mockRejectedValue(new Error('Haptics failed'));

            await expect(showToast('success', 'Title')).resolves.not.toThrow();
        });
    });

    describe('helper methods', () => {
        it('toastSuccess should call showToast with correct params', async () => {
            toastSuccess('Success Title', 'Success Msg');
            // Wait for the async showToast call inside
            await new Promise(resolve => process.nextTick(resolve));
            expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
                type: 'success',
                text1: 'Success Title',
            }));
        });

        it('toastError should call showToast with correct params', async () => {
            toastError('Error Title');
            await new Promise(resolve => process.nextTick(resolve));
            expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
                type: 'error',
                text1: 'Error Title',
            }));
        });

        it('toastInfo should call showToast with correct params', async () => {
            toastInfo('Info Title');
            await new Promise(resolve => process.nextTick(resolve));
            expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
                type: 'info',
                text1: 'Info Title',
            }));
        });
    });
});
