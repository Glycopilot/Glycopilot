import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GlycemiaChartTooltip from '../GlycemiaChartTooltip';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  X: () => null,
}));

describe('GlycemiaChartTooltip', () => {
  const defaultData = {
    value: 120,
    label: '12h',
    context: 'Avant repas',
    time: '12:00',
    date: '15 Janvier 2024',
  };

  it('renders nothing when data is null', () => {
    const { toJSON } = render(
      <GlycemiaChartTooltip visible={true} data={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders correctly with normal data', () => {
    const { getByText } = render(
      <GlycemiaChartTooltip visible={true} data={defaultData} onClose={jest.fn()} />,
    );
    expect(getByText('Mesure de glycémie')).toBeTruthy();
    expect(getByText('120')).toBeTruthy();
    expect(getByText('Normal')).toBeTruthy();
    expect(getByText('12:00')).toBeTruthy();
    expect(getByText('Avant repas')).toBeTruthy();
    expect(getByText('15 Janvier 2024')).toBeTruthy();
  });

  it('renders correctly with hypoglycemia data', () => {
    const { getByText } = render(
      <GlycemiaChartTooltip
        visible={true}
        data={{ ...defaultData, value: 60 }}
        onClose={jest.fn()}
      />,
    );
    expect(getByText('60')).toBeTruthy();
    expect(getByText('Hypoglycémie')).toBeTruthy();
  });

  it('renders correctly with hyperglycemia data', () => {
    const { getByText } = render(
      <GlycemiaChartTooltip
        visible={true}
        data={{ ...defaultData, value: 200 }}
        onClose={jest.fn()}
      />,
    );
    expect(getByText('200')).toBeTruthy();
    expect(getByText('Hyperglycémie')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <GlycemiaChartTooltip visible={true} data={defaultData} onClose={onClose} />,
    );
    fireEvent.press(getByText('Fermer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders without optional fields', () => {
    const { getByText, queryByText } = render(
      <GlycemiaChartTooltip
        visible={true}
        data={{ value: 120, label: '12h' }}
        onClose={jest.fn()}
      />,
    );
    expect(getByText('120')).toBeTruthy();
    expect(queryByText('Heure')).toBeNull();
    expect(queryByText('Contexte')).toBeNull();
  });
});
