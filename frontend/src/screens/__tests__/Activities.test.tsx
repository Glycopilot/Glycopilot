import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ActivityScreen from '../Activities';

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
};

describe('Activities Screen', () => {
    it('renders correctly and shows initial activities', async () => {
        const { getByText, getAllByText } = render(<ActivityScreen navigation={mockNavigation as any} />);

        await waitFor(() => {
            expect(getByText('Activité')).toBeTruthy();
            expect(getByText('Cette semaine')).toBeTruthy();
            expect(getAllByText('Course').length).toBeGreaterThan(0);
            expect(getAllByText('Marche').length).toBeGreaterThan(0);
        });
    });


    it('opens and closes the add activity modal', async () => {
        const { getByTestId, getByText, queryByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
        
        fireEvent.press(getByTestId('add-activity-button'));

        expect(getByText('Ajouter une activité')).toBeTruthy();

        fireEvent.press(getByText('Annuler'));
        await waitFor(() => expect(queryByText('Ajouter une activité')).toBeNull());
    });

    it('handles activity type selection and duration changes', async () => {
        const { getByTestId, getByText, getByPlaceholderText } = render(<ActivityScreen navigation={mockNavigation as any} />);
        
        fireEvent.press(getByTestId('add-activity-button'));

        // Select "Vélo"
        fireEvent.press(getByTestId('activity-type-vélo'));

        // Use duration plus button
        fireEvent.press(getByTestId('duration-plus')); // 0 -> 5
        fireEvent.press(getByTestId('duration-plus')); // 5 -> 10
        
        expect(getByText('~70 kcal')).toBeTruthy(); // 7 (avg) * 10 (min) * 1.0 (moderate) = 70
        
        // Use duration minus button
        fireEvent.press(getByTestId('duration-minus')); // 10 -> 5
        expect(getByText('~35 kcal')).toBeTruthy(); // 7 * 5 = 35
    });

    it('handles intensity changes and impacts', async () => {
        const { getByTestId, getByText, getByPlaceholderText } = render(<ActivityScreen navigation={mockNavigation as any} />);
        fireEvent.press(getByTestId('add-activity-button'));
        fireEvent.press(getByTestId('activity-type-course')); // avg 8
        
        const input = getByPlaceholderText('30');
        fireEvent.changeText(input, '10');
        
        fireEvent.press(getByText('Intense')); // factor 1.4
        // 8 * 10 * 1.4 = 112
        expect(getByText('~112 kcal')).toBeTruthy();
        expect(getByText('-4')).toBeTruthy(); // impact = 112 / 25 = 4.48 -> 4
    });

    it('handles NaN duration and increments correctly', async () => {
        const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
        fireEvent.press(getByTestId('add-activity-button'));
        fireEvent.press(getByTestId('activity-type-marche')); // avg 4
        
        // Enter invalid text
        fireEvent.changeText(getByTestId('duration-input'), 'abc');
        fireEvent.press(getByTestId('duration-plus'));
        
        expect(getByText('~20 kcal')).toBeTruthy(); // 4 * 5 = 20
    });


    it('submits the form and resets state using testID', async () => {
        const { getByTestId, getByText, queryByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
        fireEvent.press(getByTestId('add-activity-button'));
        fireEvent.press(getByTestId('activity-type-course'));
        fireEvent.changeText(getByTestId('duration-input'), '20');
        
        fireEvent.press(getByTestId('submit-activity'));
        await waitFor(() => expect(queryByText('Ajouter une activité')).toBeNull());
    });

    it('closes modal when overlay is pressed', async () => {
        const { getByTestId, queryByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
        fireEvent.press(getByTestId('add-activity-button'));
        
        await waitFor(() => expect(getByTestId('modal-overlay')).toBeTruthy());
        fireEvent.press(getByTestId('modal-overlay'));
        
        await waitFor(() => expect(queryByText('Ajouter une activité')).toBeNull());
    });
});





