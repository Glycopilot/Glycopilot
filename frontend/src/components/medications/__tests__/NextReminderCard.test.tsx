import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NextReminderCard from '../NextReminderCard';
import type { MedicationIntake } from '../../../types/medications.types';

const mockIntake: MedicationIntake = {
  id: 1,
  user_medication: 1,
  schedule: 1,
  scheduled_date: '2026-05-09',
  scheduled_time: '08:00:00',
  status: 'pending',
  taken_at: null,
  snoozed_until: null,
  created_at: '2026-05-09T06:00:00Z',
  updated_at: '2026-05-09T06:00:00Z',
  medication_name: 'Doliprane',
  medication_dosage: '1000 mg',
  meal_timing: 'anytime',
  reminder_enabled: true,
};

describe('NextReminderCard', () => {
  it('renders upcoming reminder correctly', () => {
    const { getByText } = render(
      <NextReminderCard nextIntake={mockIntake} onViewAll={jest.fn()} />
    );
    expect(getByText('Prochain rappel')).toBeTruthy();
    expect(getByText(/Doliprane/)).toBeTruthy();
    expect(getByText(/08:00/)).toBeTruthy();
  });

  it('renders overdue state with red styling', () => {
    const { getByText } = render(
      <NextReminderCard nextIntake={mockIntake} isOverdue onViewAll={jest.fn()} />
    );
    expect(getByText('En retard')).toBeTruthy();
    expect(getByText(/prévu à 08:00/)).toBeTruthy();
  });

  it('shows medication name and dosage', () => {
    const { getByText } = render(
      <NextReminderCard nextIntake={mockIntake} onViewAll={jest.fn()} />
    );
    expect(getByText(/1000 mg/)).toBeTruthy();
  });

  it('calls onViewAll when link pressed', () => {
    const onViewAll = jest.fn();
    const { getByText } = render(
      <NextReminderCard nextIntake={mockIntake} onViewAll={onViewAll} />
    );
    fireEvent.press(getByText('Voir toutes les doses →'));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('renders without dosage', () => {
    const intake = { ...mockIntake, medication_dosage: null };
    const { getByText } = render(
      <NextReminderCard nextIntake={intake} onViewAll={jest.fn()} />
    );
    expect(getByText(/Doliprane/)).toBeTruthy();
  });

  it('defaults isOverdue to false', () => {
    const { getByText } = render(
      <NextReminderCard nextIntake={mockIntake} onViewAll={jest.fn()} />
    );
    expect(getByText('Prochain rappel')).toBeTruthy();
  });
});
