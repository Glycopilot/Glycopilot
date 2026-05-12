import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IntakeCard from '../IntakeCard';
import { MedicationIntake } from '../../../types/medications.types';

const mockIntake: MedicationIntake = {
    id: 'intake-1',
    medication_id: 'med-1',
    medication_name: 'Metformine',
    medication_dosage: '500mg',
    scheduled_time: '08:00:00',
    meal_timing: 'before_meal',
    status: 'pending',
};


describe('IntakeCard', () => {
    it('renders pending intake correctly', () => {
        const { getByText } = render(
            <IntakeCard 
                intake={mockIntake} 
                onTake={jest.fn()} 
                onSnooze={jest.fn()} 
                onMiss={jest.fn()} 
            />
        );
        expect(getByText('Metformine')).toBeTruthy();
        expect(getByText('500mg • Avant repas')).toBeTruthy();

        expect(getByText('Prendre')).toBeTruthy();
    });

    it('calls callbacks when buttons are pressed', () => {
        const onTake = jest.fn();
        const onSnooze = jest.fn();
        const onMiss = jest.fn();
        const { getByText } = render(
            <IntakeCard 
                intake={mockIntake} 
                onTake={onTake} 
                onSnooze={onSnooze} 
                onMiss={onMiss} 
            />
        );
        
        fireEvent.press(getByText('Prendre'));
        expect(onTake).toHaveBeenCalled();

        fireEvent.press(getByText('Reporter'));
        expect(onSnooze).toHaveBeenCalled();

        fireEvent.press(getByText('Ignorer'));
        expect(onMiss).toHaveBeenCalled();
    });

    it('renders taken status correctly', () => {
        const takenIntake: MedicationIntake = {
            ...mockIntake,
            status: 'taken',
            taken_at: '2023-01-01T08:05:00Z',
        };
        const { getByText } = render(
            <IntakeCard 
                intake={takenIntake} 
                onTake={jest.fn()} 
                onSnooze={jest.fn()} 
                onMiss={jest.fn()} 
            />
        );
        expect(getByText('Pris')).toBeTruthy();
        expect(getByText(/Pris à/)).toBeTruthy();
    });

});
