import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import GlycemiaChartTooltip from '../GlycemiaChartTooltip';

describe('GlycemiaChartTooltip', () => {
  it('renders nothing when no data is provided', () => {
    const { toJSON } = render(
      <GlycemiaChartTooltip visible data={null} onClose={jest.fn()} />
    );

    expect(toJSON()).toBeNull();
  });

  it.each([
    [62, 'Hypoglycémie'],
    [118, 'Normal'],
    [215, 'Hyperglycémie'],
  ])('renders the status for %i mg/dL', (value, status) => {
    const { getByText } = render(
      <GlycemiaChartTooltip
        visible
        data={{
          value,
          label: `${value}`,
          date: '17/05/2026',
          time: '09:30',
          context: 'À jeun',
        }}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Mesure de glycémie')).toBeTruthy();
    expect(getByText(String(value))).toBeTruthy();
    expect(getByText(status)).toBeTruthy();
    expect(getByText('17/05/2026')).toBeTruthy();
    expect(getByText('09:30')).toBeTruthy();
    expect(getByText('À jeun')).toBeTruthy();
    expect(getByText('70 - 180 mg/dL')).toBeTruthy();
  });

  it('closes from both close controls and the backdrop', () => {
    const onClose = jest.fn();
    const { getAllByText, UNSAFE_getByType } = render(
      <GlycemiaChartTooltip
        visible
        data={{ value: 118, label: '118' }}
        onClose={onClose}
      />
    );

    fireEvent.press(getAllByText('Fermer')[0]);
    UNSAFE_getByType(require('react-native').Modal).props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
