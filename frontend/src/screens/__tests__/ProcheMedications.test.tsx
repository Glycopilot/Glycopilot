import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import apiClient from '../../services/apiClient';
import ProcheMedicationsScreen from '../ProcheMedications';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

describe('ProcheMedications Screen', () => {
  let mock: MockAdapter;

  const takenEntry = {
    id: 'med-1',
    name: 'Metformine',
    dosage: '500 mg',
    taken: true,
    takenAt: '2026-01-10T08:30:00Z',
    scheduledAt: '2026-01-10T08:00:00Z',
    active: true,
  };

  const pendingEntry = {
    id: 'med-2',
    name: 'Doliprane',
    dosage: '1000 mg',
    taken: false,
    takenAt: null,
    scheduledAt: '2026-01-10T12:00:00Z',
    active: true,
  };

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it('renders without crashing', async () => {
    mock.onGet('/doctors/care-team/proche-medications/').reply(200, []);
    render(<ProcheMedicationsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {});
  });

  it('shows header title "Médicaments"', async () => {
    mock.onGet('/doctors/care-team/proche-medications/').reply(200, []);
    const { findByText } = render(
      <ProcheMedicationsScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Médicaments')).toBeTruthy();
  });

  it('shows empty state when no medications', async () => {
    mock.onGet('/doctors/care-team/proche-medications/').reply(200, []);
    const { findByText } = render(
      <ProcheMedicationsScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Aucun médicament')).toBeTruthy();
  });

  it('shows taken medications in "Pris" section', async () => {
    mock
      .onGet('/doctors/care-team/proche-medications/')
      .reply(200, [takenEntry]);
    const { findByText } = render(
      <ProcheMedicationsScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Metformine')).toBeTruthy();
    expect(await findByText('Pris (1)')).toBeTruthy();
  });

  it('shows pending medications in "Non pris" section', async () => {
    mock
      .onGet('/doctors/care-team/proche-medications/')
      .reply(200, [pendingEntry]);
    const { findByText } = render(
      <ProcheMedicationsScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Doliprane')).toBeTruthy();
    expect(await findByText('Non pris (1)')).toBeTruthy();
  });

  it('separates taken and pending medications', async () => {
    mock
      .onGet('/doctors/care-team/proche-medications/')
      .reply(200, [takenEntry, pendingEntry]);
    const { findByText } = render(
      <ProcheMedicationsScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Metformine')).toBeTruthy();
    expect(await findByText('Doliprane')).toBeTruthy();
    expect(await findByText(/Pris \(1\)/)).toBeTruthy();
    expect(await findByText(/Non pris \(1\)/)).toBeTruthy();
  });

  it('shows dosage for each medication', async () => {
    mock
      .onGet('/doctors/care-team/proche-medications/')
      .reply(200, [takenEntry]);
    const { findByText } = render(
      <ProcheMedicationsScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('500 mg')).toBeTruthy();
  });

  it('shows empty list when API fails', async () => {
    mock.onGet('/doctors/care-team/proche-medications/').reply(500);
    const { findByText } = render(
      <ProcheMedicationsScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Aucun médicament')).toBeTruthy();
  });

  it('navigates back to ProcheHome when back button pressed', async () => {
    mock.onGet('/doctors/care-team/proche-medications/').reply(200, []);
    const { UNSAFE_getAllByType } = render(
      <ProcheMedicationsScreen navigation={mockNavigation as any} />
    );
    await waitFor(() => {});
    const { TouchableOpacity } = require('react-native');
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(buttons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('ProcheHome');
  });

  it('shows count of total meds in subtitle', async () => {
    mock
      .onGet('/doctors/care-team/proche-medications/')
      .reply(200, [takenEntry, pendingEntry]);
    const { findByText } = render(
      <ProcheMedicationsScreen navigation={mockNavigation as any} />
    );
    expect(await findByText(/2 prises/)).toBeTruthy();
  });
});
function expect(arg0: ReactTestInstance) {
  throw new Error('Function not implemented.');
}
