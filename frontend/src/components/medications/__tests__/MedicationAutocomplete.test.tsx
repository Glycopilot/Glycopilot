import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import MedicationAutocomplete from '../MedicationAutocomplete';

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Pill: () => null,
  X: () => null,
}));

// Mock process.env
process.env.EXPO_PUBLIC_FDA_API_URL = 'https://api.fda.gov/drug/label.json';

describe('MedicationAutocomplete', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders correctly with label', () => {
    const { getByText, getByPlaceholderText } = render(
      <MedicationAutocomplete 
        value="" 
        onChangeText={jest.fn()} 
        onSelectMedication={jest.fn()} 
        label="Nom du médicament"
      />
    );

    expect(getByText('Nom du médicament')).toBeTruthy();
    expect(getByPlaceholderText('Rechercher un médicament...')).toBeTruthy();
  });

  it('handles text change and debounces search', async () => {
    const onChangeText = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: [] }),
    });

    const { getByPlaceholderText } = render(
      <MedicationAutocomplete 
        value="" 
        onChangeText={onChangeText} 
        onSelectMedication={jest.fn()} 
      />
    );

    const input = getByPlaceholderText('Rechercher un médicament...');
    fireEvent.changeText(input, 'Doli');

    expect(onChangeText).toHaveBeenCalledWith('Doli');

    // Fast-forward for debounce
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('openfda.brand_name:Doli*')
    );
  });

  it('shows suggestions and handles selection', async () => {
    const onSelect = jest.fn();
    const mockResults = {
      results: [
        {
          openfda: {
            brand_name: ['Doliprane'],
            generic_name: ['Paracetamol']
          }
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResults),
    });

    const { getByPlaceholderText, findByText } = render(
      <MedicationAutocomplete 
        value="Doli" 
        onChangeText={jest.fn()} 
        onSelectMedication={onSelect} 
      />
    );

    const input = getByPlaceholderText('Rechercher un médicament...');
    
    await act(async () => {
      fireEvent.changeText(input, 'Doliprane');
      jest.advanceTimersByTime(300);
    });

    const suggestion = await findByText('Doliprane');
    expect(suggestion).toBeTruthy();
    expect(await findByText('Paracetamol')).toBeTruthy();

    await act(async () => {
      fireEvent.press(suggestion);
    });

    expect(onSelect).toHaveBeenCalledWith({
      brandName: 'Doliprane',
      genericName: 'Paracetamol'
    });
  });

  it('handles 404 from FDA API as empty results', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 404,
      ok: false,
    });

    const { getByPlaceholderText, findByText } = render(
      <MedicationAutocomplete 
        value="" 
        onChangeText={jest.fn()} 
        onSelectMedication={jest.fn()} 
      />
    );

    const input = getByPlaceholderText('Rechercher un médicament...');
    
    await act(async () => {
      fireEvent.changeText(input, 'UnknownMed');
      jest.advanceTimersByTime(300);
    });

    expect(await findByText('Aucun médicament trouvé')).toBeTruthy();
  });

  it('handles API error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { getByPlaceholderText, findByText } = render(
      <MedicationAutocomplete 
        value="" 
        onChangeText={jest.fn()} 
        onSelectMedication={jest.fn()} 
      />
    );

    const input = getByPlaceholderText('Rechercher un médicament...');
    
    await act(async () => {
      fireEvent.changeText(input, 'ErrorMed');
      jest.advanceTimersByTime(300);
    });

    expect(await findByText('Erreur lors de la recherche')).toBeTruthy();
  });

  it('clears input when X is pressed', async () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <MedicationAutocomplete 
        value="Doliprane" 
        onChangeText={onChangeText} 
        onSelectMedication={jest.fn()} 
      />
    );

    const clearButton = getByTestId('medication-autocomplete-clear');
    fireEvent.press(clearButton);

    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
