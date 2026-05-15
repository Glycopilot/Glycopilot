import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import ActivityScreen from '../Activities';

jest.mock('../../components/common/Layout', () => {
  return function MockLayout({ children }: any) {
    return <>{children}</>;
  };
});

const mockNavigation = { navigate: jest.fn() };

/** Premier « Plus » = bouton d’ajout dans l’en-tête « Activités récentes » (mock lucide → testID). */
function pressHeaderAddActivity(screen: ReturnType<typeof render>): void {
  const plusIcons = screen.getAllByTestId('Plus');
  fireEvent.press(plusIcons[0].parent!);
}

/** Dans le modal ouvert : 2e « Plus » = incrément durée. */
function pressDurationPlus(screen: ReturnType<typeof render>): void {
  const plusIcons = screen.getAllByTestId('Plus');
  fireEvent.press(plusIcons[1].parent!);
}

function pressDurationMinus(screen: ReturnType<typeof render>): void {
  const minusIcons = screen.getAllByTestId('Minus');
  fireEvent.press(minusIcons[0].parent!);
}

function getDurationInput(screen: ReturnType<typeof render>) {
  return screen.getByPlaceholderText('30');
}

/** « Course » apparaît aussi dans la liste : on prend la dernière occurrence (grille du modal). */
function pressActivityTypeCourse(screen: ReturnType<typeof render>): void {
  const labels = screen.getAllByText('Course');
  const last = labels[labels.length - 1];
  fireEvent.press(last.parent!);
}

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
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => {
      expect(screen.getByText('Ajouter une activité')).toBeTruthy();
    });
  });

  it('modal contains activity type grid with all types', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Course').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Marche').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Vélo').length).toBeGreaterThan(0);
      expect(screen.getByText('Natation')).toBeTruthy();
      expect(screen.getByText('Yoga')).toBeTruthy();
      expect(screen.getByText('Musculation')).toBeTruthy();
    });
  });

  it('selecting an activity type updates the state', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getByText('Ajouter une activité')).toBeTruthy());
    await act(async () => {
      pressActivityTypeCourse(screen);
    });
  });

  it('modal contains intensity buttons', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => {
      expect(screen.getByText('Légère')).toBeTruthy();
      expect(screen.getByText('Modérée')).toBeTruthy();
      expect(screen.getByText('Intense')).toBeTruthy();
    });
  });

  it('can change intensity', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getByText('Légère')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Légère'));
      fireEvent.press(screen.getByText('Intense'));
    });
  });

  it('increment duration increases value', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getAllByTestId('Plus').length).toBeGreaterThan(1));
    await act(async () => {
      pressDurationPlus(screen);
    });

    const input = getDurationInput(screen);
    expect(input.props.value).toBe('5');
  });

  it('decrement duration stays at 0 when already 0', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getAllByTestId('Minus').length).toBeGreaterThan(0));
    await act(async () => {
      pressDurationMinus(screen);
    });

    const input = getDurationInput(screen);
    expect(input.props.value).toBe('0');
  });

  it('typing duration directly works', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(getDurationInput(screen)).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getDurationInput(screen), '45');
    });

    expect(getDurationInput(screen).props.value).toBe('45');
  });

  it('shows estimations when both activity type and duration are set', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getByText('Ajouter une activité')).toBeTruthy());
    await act(async () => {
      pressActivityTypeCourse(screen);
      fireEvent.changeText(getDurationInput(screen), '30');
    });

    await waitFor(() => {
      expect(screen.getByText('Estimations')).toBeTruthy();
    });
  });

  it('pressing cancel closes the modal', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getByText('Annuler')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Annuler'));
    });

    await waitFor(() => {
      expect(screen.queryByText('Ajouter une activité')).toBeNull();
    });
  });

  it('submit with activity type and duration closes modal and resets form', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getByText('Ajouter une activité')).toBeTruthy());
    await act(async () => {
      pressActivityTypeCourse(screen);
    });
    await act(async () => {
      fireEvent.changeText(getDurationInput(screen), '30');
    });
    await act(async () => {
      fireEvent.press(screen.getByText(/^Ajouter$/).parent!);
    });

    await waitFor(() => {
      expect(screen.queryByText('Ajouter une activité')).toBeNull();
    });
  });

  it('renders modal info card text', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => {
      expect(screen.getByText('Conseil')).toBeTruthy();
    });
  });

  it('renders modal Ajouter button', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => {
      expect(screen.getByText(/^Ajouter$/)).toBeTruthy();
    });
  });

  it('selecting Yoga type works', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getByText('Yoga')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Yoga'));
    });
  });

  it('selecting Natation type works', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getByText('Natation')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Natation'));
    });
  });

  it('selecting Musculation type shows estimation', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getByText('Musculation')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Musculation'));
      fireEvent.changeText(getDurationInput(screen), '60');
    });

    await waitFor(() => expect(screen.getByText(/^Ajouter$/)).toBeTruthy());
  });

  it('increment and decrement multiple times', async () => {
    const screen = render(<ActivityScreen navigation={mockNavigation as any} />);
    await act(async () => {
      pressHeaderAddActivity(screen);
    });

    await waitFor(() => expect(screen.getAllByTestId('Plus').length).toBeGreaterThan(1));
    await act(async () => { pressDurationPlus(screen); });
    await act(async () => { pressDurationPlus(screen); });
    await act(async () => { pressDurationPlus(screen); });
    await act(async () => { pressDurationPlus(screen); });
    await act(async () => { pressDurationMinus(screen); });

    const input = getDurationInput(screen);
    // 0 → +5×4 → 20 → −5 → 15
    expect(input.props.value).toBe('15');
  });
});
