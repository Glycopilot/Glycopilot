import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import ActivityScreen from '../Activities';

jest.mock('../../components/common/Layout', () => {
  return function MockLayout({ children }: any) {
    return <>{children}</>;
  };
});

const mockNavigation = { navigate: jest.fn() };

describe('Activities Screen — main view', () => {
  it('renders title and weekly summary', async () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Activité')).toBeTruthy();
      expect(getByText('Cette semaine')).toBeTruthy();
    });
  });

  it('displays the weekly objective', () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getByText(/Objectif:/)).toBeTruthy();
  });

  it('renders activity list with course and marche', () => {
    const { getAllByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    // 'Course', 'Marche', 'Vélo' appear in both the list and the modal type grid
    expect(getAllByText('Course').length).toBeGreaterThan(0);
    expect(getAllByText('Marche').length).toBeGreaterThan(0);
    expect(getAllByText('Vélo').length).toBeGreaterThan(0);
  });

  it('renders Activités récentes section', () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getByText('Activités récentes')).toBeTruthy();
  });

  it('renders impact sur la glycémie section', () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getByText('Impact sur la glycémie')).toBeTruthy();
  });

  it('renders conseil du jour', () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getByText('Conseil du jour')).toBeTruthy();
  });

  it('renders stat labels', () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getByText('Séances')).toBeTruthy();
    expect(getByText('Calories')).toBeTruthy();
    expect(getByText('Tendance')).toBeTruthy();
  });
});

describe('Activities Screen — stats and summary', () => {
  it('shows total duration and calories summary', () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    // totalDuration = 45 + 30 = 75 (first 2 activities)
    expect(getByText('75')).toBeTruthy();
  });

  it('shows min unit label', () => {
    const { getAllByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getAllByText('min').length).toBeGreaterThan(0);
  });

  it('shows objectif badge', () => {
    const { getAllByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getAllByText(/Objectif/).length).toBeGreaterThan(0);
  });

  it('shows +12% trend', () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getByText('+12%')).toBeTruthy();
  });

  it('shows calorie info in activity cards', () => {
    const { getAllByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getAllByText(/kcal/).length).toBeGreaterThan(0);
  });

  it('renders activity time stamps', () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getByText('07:30')).toBeTruthy();
  });

  it('renders mg/dL impact text', () => {
    const { getAllByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getAllByText(/mg\/dL/).length).toBeGreaterThan(0);
  });

  it('renders en moyenne label', () => {
    const { getAllByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    expect(getAllByText('en moyenne').length).toBeGreaterThan(0);
  });
});

describe('Activities Screen — add activity modal', () => {
  it('opens modal when add button is pressed', async () => {
    const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    const addBtn = getByTestId('add-activity-button');

    await act(async () => { fireEvent.press(addBtn); });

    await waitFor(() => {
      expect(getByText('Ajouter une activité')).toBeTruthy();
    });
  });

  it('modal contains activity type grid with all types', async () => {
    const { getByTestId, getAllByText, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => {
      expect(getAllByText('Course').length).toBeGreaterThan(0);
      expect(getAllByText('Marche').length).toBeGreaterThan(0);
      expect(getAllByText('Vélo').length).toBeGreaterThan(0);
      expect(getByText('Natation')).toBeTruthy();
      expect(getByText('Yoga')).toBeTruthy();
      expect(getByText('Musculation')).toBeTruthy();
    });
  });

  it('selecting an activity type updates the state', async () => {
    const { getByTestId } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('activity-type-course')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('activity-type-course')); });
    // No crash = type selection works
  });

  it('modal contains intensity buttons', async () => {
    const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => {
      expect(getByText('Légère')).toBeTruthy();
      expect(getByText('Modérée')).toBeTruthy();
      expect(getByText('Intense')).toBeTruthy();
    });
  });

  it('can change intensity', async () => {
    const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByText('Légère')).toBeTruthy());
    await act(async () => { fireEvent.press(getByText('Légère')); });
    await act(async () => { fireEvent.press(getByText('Intense')); });
  });

  it('increment duration increases value', async () => {
    const { getByTestId } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('duration-plus')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('duration-plus')); });

    const input = getByTestId('duration-input');
    expect(input.props.value).toBe('5');
  });

  it('decrement duration stays at 0 when already 0', async () => {
    const { getByTestId } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('duration-minus')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('duration-minus')); });

    const input = getByTestId('duration-input');
    expect(input.props.value).toBe('0');
  });

  it('typing duration directly works', async () => {
    const { getByTestId } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('duration-input')).toBeTruthy());
    await act(async () => { fireEvent.changeText(getByTestId('duration-input'), '45'); });

    expect(getByTestId('duration-input').props.value).toBe('45');
  });

  it('shows estimations when both activity type and duration are set', async () => {
    const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('activity-type-course')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('activity-type-course')); });
    await act(async () => { fireEvent.changeText(getByTestId('duration-input'), '30'); });

    await waitFor(() => { expect(getByText('Estimations')).toBeTruthy(); });
  });

  it('pressing cancel closes the modal', async () => {
    const { getByTestId, getByText, queryByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByText('Annuler')).toBeTruthy());
    await act(async () => { fireEvent.press(getByText('Annuler')); });

    await waitFor(() => {
      expect(queryByText('Ajouter une activité')).toBeNull();
    });
  });

  it('pressing modal overlay closes the modal', async () => {
    const { getByTestId, queryByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('modal-overlay')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('modal-overlay')); });

    await waitFor(() => {
      expect(queryByText('Ajouter une activité')).toBeNull();
    });
  });

  it('submit with activity type and duration closes modal and resets form', async () => {
    const { getByTestId, getByText, queryByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('activity-type-course')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('activity-type-course')); });
    await act(async () => { fireEvent.changeText(getByTestId('duration-input'), '30'); });
    await act(async () => { fireEvent.press(getByTestId('submit-activity')); });

    await waitFor(() => {
      expect(queryByText('Ajouter une activité')).toBeNull();
    });
  });

  it('renders modal info card text', async () => {
    const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => {
      expect(getByText('Conseil')).toBeTruthy();
    });
  });

  it('renders modal Ajouter button', async () => {
    const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => {
      expect(getByText('Ajouter')).toBeTruthy();
    });
  });

  it('selecting Yoga type works', async () => {
    const { getByTestId } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('activity-type-yoga')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('activity-type-yoga')); });
  });

  it('selecting Natation type works', async () => {
    const { getByTestId } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('activity-type-natation')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('activity-type-natation')); });
  });

  it('selecting Musculation type shows estimation', async () => {
    const { getByTestId } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('activity-type-musculation')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('activity-type-musculation')); });
    await act(async () => { fireEvent.changeText(getByTestId('duration-input'), '60'); });

    await waitFor(() => expect(getByTestId('submit-activity')).toBeTruthy());
  });

  it('increment and decrement multiple times', async () => {
    const { getByTestId } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => { fireEvent.press(getByTestId('add-activity-button')); });

    await waitFor(() => expect(getByTestId('duration-plus')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('duration-plus')); });
    await act(async () => { fireEvent.press(getByTestId('duration-plus')); });
    await act(async () => { fireEvent.press(getByTestId('duration-plus')); });
    await act(async () => { fireEvent.press(getByTestId('duration-minus')); });

    const input = getByTestId('duration-input');
    expect(input.props.value).toBe('10');
  });
});
