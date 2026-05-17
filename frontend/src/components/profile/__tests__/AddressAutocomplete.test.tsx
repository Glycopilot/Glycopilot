import React from 'react';
import { Keyboard } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AddressAutocomplete from '../Addressautocomplete ';

const suggestion = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
  properties: {
    label: '10 rue de Paris 75001 Paris',
    score: 0.9,
    id: 'addr-1',
    name: '10 rue de Paris',
    postcode: '75001',
    citycode: '75101',
    x: 0,
    y: 0,
    city: 'Paris',
    context: '75, Paris',
    importance: 0.8,
  },
};

describe('AddressAutocomplete', () => {
  const onChangeText = jest.fn();
  const onSelectAddress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ features: [suggestion] }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('searches and selects an address suggestion', async () => {
    const { getByPlaceholderText, getByText } = render(
      <AddressAutocomplete
        value=""
        onChangeText={onChangeText}
        onSelectAddress={onSelectAddress}
        label="Adresse"
      />
    );

    fireEvent.changeText(getByPlaceholderText('Rechercher une adresse...'), 'Paris');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(getByText('10 rue de Paris')).toBeTruthy());
    fireEvent.press(getByText('10 rue de Paris'));

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api-adresse.data.gouv.fr/search/?q=Paris&limit=5'
    );
    expect(onChangeText).toHaveBeenCalledWith('Paris');
    expect(onSelectAddress).toHaveBeenCalledWith(suggestion.properties.label, suggestion);
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
  });

  it('does not search when the query is too short', () => {
    const { getByPlaceholderText, queryByText } = render(
      <AddressAutocomplete
        value=""
        onChangeText={onChangeText}
        onSelectAddress={onSelectAddress}
      />
    );

    fireEvent.changeText(getByPlaceholderText('Rechercher une adresse...'), 'Pa');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(queryByText('10 rue de Paris')).toBeNull();
  });

  it('hides suggestions when the search request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { getByPlaceholderText, queryByText } = render(
      <AddressAutocomplete
        value=""
        onChangeText={onChangeText}
        onSelectAddress={onSelectAddress}
      />
    );

    fireEvent.changeText(getByPlaceholderText('Rechercher une adresse...'), 'Paris');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(queryByText('10 rue de Paris')).toBeNull();
  });
});
