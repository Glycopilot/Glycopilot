import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import MedicationAutocomplete from '../MedicationAutocomplete';

// Mock lucide-react-native (icônes = View + testID, comme jest.setup.js)
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockIcon = (name) => (props) =>
    React.createElement(View, { ...props, testID: name });
  return {
    Pill: mockIcon('Pill'),
    X: mockIcon('X'),
  };
});

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

    const clearButton = getByTestId('X');
    fireEvent.press(clearButton.parent!);

    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('does not show clear button when value is empty', () => {
    const { queryByTestId } = render(
      <MedicationAutocomplete 
        value="" 
        onChangeText={jest.fn()} 
        onSelectMedication={jest.fn()} 
      />
    );
    expect(queryByTestId('X')).toBeNull();
  });

  it('renders without label when label prop is omitted', () => {
    const { queryByText } = render(
      <MedicationAutocomplete value="" onChangeText={jest.fn()} onSelectMedication={jest.fn()} />
    );
    expect(queryByText('Nom du médicament')).toBeNull();
  });

  it('does not call fetch when query is shorter than 2 characters', async () => {
    const { getByPlaceholderText } = render(
      <MedicationAutocomplete value="" onChangeText={jest.fn()} onSelectMedication={jest.fn()} />
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Rechercher un médicament...'), 'D');
      jest.advanceTimersByTime(300);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders with custom placeholder', () => {
    const { getByPlaceholderText } = render(
      <MedicationAutocomplete
        value=""
        onChangeText={jest.fn()}
        onSelectMedication={jest.fn()}
        placeholder="Chercher..."
      />
    );
    expect(getByPlaceholderText('Chercher...')).toBeTruthy();
  });

  it('returns empty results when EXPO_PUBLIC_FDA_API_URL is not set', async () => {
    const originalUrl = process.env.EXPO_PUBLIC_FDA_API_URL;
    process.env.EXPO_PUBLIC_FDA_API_URL = '';

    const { getByPlaceholderText } = render(
      <MedicationAutocomplete value="" onChangeText={jest.fn()} onSelectMedication={jest.fn()} />
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Rechercher un médicament...'), 'Test');
      jest.advanceTimersByTime(300);
    });

    expect(global.fetch).not.toHaveBeenCalled();

    process.env.EXPO_PUBLIC_FDA_API_URL = originalUrl;
  });

  it('onFocus shows suggestions again when they exist', async () => {
    const mockResults = {
      results: [{ openfda: { brand_name: ['Metformine'], generic_name: ['Metformin HCl'] } }],
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResults),
    });

    const { getByPlaceholderText, findByText } = render(
      <MedicationAutocomplete value="" onChangeText={jest.fn()} onSelectMedication={jest.fn()} />
    );
    const input = getByPlaceholderText('Rechercher un médicament...');

    // Perform search to populate suggestions
    await act(async () => {
      fireEvent.changeText(input, 'Metf');
      jest.advanceTimersByTime(300);
    });

    // Suggestions should be visible
    expect(await findByText('Metformine')).toBeTruthy();

    // Fire focus event — triggers onFocus handler with suggestions.length > 0
    await act(async () => {
      fireEvent(input, 'focus');
    });

    // Suggestions still visible
    expect(await findByText('Metformine')).toBeTruthy();
  });

  it('shows loading indicator during search', async () => {
    let resolveSearch: (v: any) => void;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise(res => { resolveSearch = res; })
    );

    const { getByPlaceholderText, UNSAFE_getAllByType } = render(
      <MedicationAutocomplete value="" onChangeText={jest.fn()} onSelectMedication={jest.fn()} />
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Rechercher un médicament...'), 'Metfo');
      jest.advanceTimersByTime(300);
    });

    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);

    // Resolve to avoid open handles
    resolveSearch!({ ok: true, json: async () => ({ results: [] }) });
    await act(async () => { jest.advanceTimersByTime(100); });
  });

  it('deduplicates results with same brand + generic name', async () => {
    const duplicateResults = {
      results: [
        { openfda: { brand_name: ['Doliprane'], generic_name: ['Paracetamol'] } },
        { openfda: { brand_name: ['Doliprane'], generic_name: ['Paracetamol'] } }, // duplicate
        { openfda: { brand_name: ['Efferalgan'], generic_name: ['Paracetamol'] } },
      ],
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(duplicateResults),
    });

    const { getByPlaceholderText, findByText, queryAllByText } = render(
      <MedicationAutocomplete value="" onChangeText={jest.fn()} onSelectMedication={jest.fn()} />
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Rechercher un médicament...'), 'Doli');
      jest.advanceTimersByTime(300);
    });

    // Doliprane should appear only once (deduplicated)
    expect(await findByText('Doliprane')).toBeTruthy();
    expect(queryAllByText('Doliprane').length).toBe(1);
    expect(await findByText('Efferalgan')).toBeTruthy();
  });

  it('skips results with no brand name', async () => {
    const mockResults = {
      results: [
        { openfda: {} }, // no brand_name — should be skipped
        { openfda: { brand_name: ['Ibuprofen'], generic_name: ['Ibuprofène'] } },
      ],
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResults),
    });

    const { getByPlaceholderText, findByText } = render(
      <MedicationAutocomplete value="" onChangeText={jest.fn()} onSelectMedication={jest.fn()} />
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Rechercher un médicament...'), 'Ibu');
      jest.advanceTimersByTime(300);
    });

    // Only Ibuprofen should appear (the one without brand_name was skipped)
    expect(await findByText('Ibuprofen')).toBeTruthy();
  });

  it('shows suggestions with no generic name gracefully', async () => {
    const onSelect = jest.fn();
    const mockResults = {
      results: [{ openfda: { brand_name: ['Doliprane'] } }],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResults),
    });

    const { getByPlaceholderText, findByText } = render(
      <MedicationAutocomplete value="" onChangeText={jest.fn()} onSelectMedication={onSelect} />
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Rechercher un médicament...'), 'Doli');
      jest.advanceTimersByTime(300);
    });

    expect(await findByText('Doliprane')).toBeTruthy();
  });
});
