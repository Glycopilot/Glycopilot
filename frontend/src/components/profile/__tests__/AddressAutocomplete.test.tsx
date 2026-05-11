import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import AddressAutocomplete from '../AddressAutocomplete';

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  MapPin: () => null,
}));

describe('AddressAutocomplete', () => {
  it('renders correctly with label', () => {
    const { getByText, getByPlaceholderText } = render(
      <AddressAutocomplete 
        value="" 
        onChangeText={jest.fn()} 
        onSelectAddress={jest.fn()} 
        label="Adresse de résidence"
      />
    );

    expect(getByText('Adresse de résidence')).toBeTruthy();
    expect(getByPlaceholderText('Rechercher une adresse...')).toBeTruthy();
  });

  it('handles text change and debounces search', async () => {
    jest.useFakeTimers();
    const onChangeText = jest.fn();
    
    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        features: []
      })
    }) as any;

    const { getByTestId } = render(
      <AddressAutocomplete 
        value="" 
        onChangeText={onChangeText} 
        onSelectAddress={jest.fn()} 
      />
    );

    const input = getByTestId('address-autocomplete-input');
    fireEvent.changeText(input, '123 Main');

    expect(onChangeText).toHaveBeenCalledWith('123 Main');

    // Fast-forward time for debounce
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=123%20Main')
    );
    
    jest.useRealTimers();
  });

  it('shows suggestions and allows selection', async () => {
    jest.useFakeTimers();
    const onSelect = jest.fn();
    const mockSuggestion = {
      properties: {
        id: '1',
        label: '123 Test Road, 75001 Paris',
        name: '123 Test Road',
        postcode: '75001',
        city: 'Paris'
      }
    };

    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        features: [mockSuggestion]
      })
    }) as any;

    const { getByTestId, findByText } = render(
      <AddressAutocomplete 
        value="123" 
        onChangeText={jest.fn()} 
        onSelectAddress={onSelect} 
      />
    );

    const input = getByTestId('address-autocomplete-input');
    
    await act(async () => {
      fireEvent.changeText(input, '1234');
      jest.advanceTimersByTime(300);
    });

    const suggestion = await findByText('123 Test Road');
    expect(suggestion).toBeTruthy();

    await act(async () => {
      fireEvent.press(suggestion);
    });

    expect(onSelect).toHaveBeenCalledWith('123 Test Road, 75001 Paris', mockSuggestion);
    jest.useRealTimers();
  });
});
