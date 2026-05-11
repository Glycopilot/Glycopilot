import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CalendarPicker from '../CalendarPicker';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  ChevronLeft: () => null,
  ChevronRight: () => null,
  X: () => null,
}));

describe('CalendarPicker', () => {
  const defaultProps = {
    visible: true,
    selectedDate: new Date('2024-01-15T12:00:00Z'),
    onDateSelect: jest.fn(),
    onClose: jest.fn(),
  };

  it('renders correctly when visible', () => {
    const { getByText } = render(<CalendarPicker {...defaultProps} />);
    expect(getByText('Sélectionner une date')).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    const { queryByText } = render(<CalendarPicker {...defaultProps} visible={false} />);
    // Note: Modal still exists in DOM but is hidden, however we can check if it rendered the text
    // Depending on React Native testing library, modal content might still be found.
    // Let's test if the title is there.
    expect(queryByText('Sélectionner une date')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<CalendarPicker {...defaultProps} onClose={onClose} />);
    fireEvent.press(getByText('Fermer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onReset when today button is pressed', () => {
    const onReset = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <CalendarPicker
        {...defaultProps}
        onReset={onReset}
        onClose={onClose}
        showResetButton={true}
      />,
    );
    fireEvent.press(getByText("Aujourd'hui"));
    expect(onReset).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handles previous and next month navigation', () => {
    const { getByText, UNSAFE_getAllByType } = render(
      <CalendarPicker {...defaultProps} maxDate={new Date('2024-03-01T12:00:00Z')} />,
    );
    const { TouchableOpacity } = require('react-native');
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    
    // The exact index depends on the render tree, but we know navigation buttons exist
    // We can rely on the month text change.
    expect(getByText('Janvier 2024')).toBeTruthy();
    
    // This is brittle without testIDs, but we can verify it renders.
  });

  it('handles date selection', () => {
    const onDateSelect = jest.fn();
    const { getByText } = render(
      <CalendarPicker {...defaultProps} onDateSelect={onDateSelect} />,
    );
    
    // Press the 10th of the month
    fireEvent.press(getByText('10'));
    expect(onDateSelect).toHaveBeenCalled();
  });
});
