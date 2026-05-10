import React from 'react';
import { render } from '@testing-library/react-native';
import MedSummaryGrid from '../MedSummaryGrid';

describe('MedSummaryGrid', () => {
  it('renders taken count and active count', () => {
    const { getByText } = render(
      <MedSummaryGrid takenToday={2} totalToday={3} activeCount={4} />
    );
    expect(getByText('2')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
  });

  it('renders zero values without crashing', () => {
    expect(() =>
      render(<MedSummaryGrid takenToday={0} totalToday={0} activeCount={0} />)
    ).not.toThrow();
  });

  it('renders total count in subtext', () => {
    const { getByText } = render(
      <MedSummaryGrid takenToday={1} totalToday={5} activeCount={2} />
    );
    expect(getByText(/sur 5/)).toBeTruthy();
  });
});
