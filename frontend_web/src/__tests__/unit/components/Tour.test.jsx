import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TourProvider, useTour } from '../../../components/tour/TourProvider';
import Tour from '../../../components/tour/Tour';
import HelpButton from '../../../components/tour/HelpButton';
import { tourSteps } from '../../../components/tour/tour-steps';

function renderWithProvider(ui, { route = '/home' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <TourProvider>
        {ui}
        <Tour />
      </TourProvider>
    </MemoryRouter>
  );
}

describe('useTour', () => {
  it('throw si utilisé hors TourProvider', () => {
    const orig = console.error;
    console.error = jest.fn();
    function Broken() {
      useTour();
      return null;
    }
    expect(() => render(<Broken />)).toThrow(/TourProvider/);
    console.error = orig;
  });
});

describe('HelpButton', () => {
  it('rend un bouton avec un aria-label parlant', () => {
    renderWithProvider(<HelpButton />);
    expect(screen.getByLabelText(/lancer la visite/i)).toBeInTheDocument();
  });

  it('la visite n\'est pas affichée tant qu\'on ne clique pas', () => {
    renderWithProvider(<HelpButton />);
    expect(screen.queryByRole('dialog', { name: /visite guidée/i })).not.toBeInTheDocument();
  });

  it('clic démarre la visite et affiche la première étape', async () => {
    renderWithProvider(<HelpButton />);
    fireEvent.click(screen.getByLabelText(/lancer la visite/i));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /visite guidée/i })).toBeInTheDocument()
    );
    expect(screen.getByText(tourSteps[0].title)).toBeInTheDocument();
  });
});

describe('Tour - navigation entre étapes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  async function startTour() {
    renderWithProvider(<HelpButton />);
    fireEvent.click(screen.getByLabelText(/lancer la visite/i));
    // L'étape 0 n'a pas de target ni de route, elle apparaît immédiatement
    await waitFor(() => expect(screen.getByText(tourSteps[0].title)).toBeInTheDocument());
  }

  it('affiche le compteur "Étape 1 sur N"', async () => {
    await startTour();
    expect(screen.getByText(`Étape 1 sur ${tourSteps.length}`)).toBeInTheDocument();
  });

  it('le bouton "Précédent" n\'est pas affiché sur la première étape', async () => {
    await startTour();
    expect(screen.queryByRole('button', { name: /précédent/i })).not.toBeInTheDocument();
  });

  it('le dot actif reflète l\'étape courante', async () => {
    await startTour();
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    tabs.slice(1).forEach((t) => expect(t).toHaveAttribute('aria-selected', 'false'));
  });

  it('clic sur un dot saute à l\'étape correspondante', async () => {
    await startTour();
    const lastIndex = tourSteps.length - 1;
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[lastIndex]);
    await waitFor(() =>
      expect(screen.getByText(tourSteps[lastIndex].title)).toBeInTheDocument()
    );
    expect(screen.getByText(`Étape ${lastIndex + 1} sur ${tourSteps.length}`)).toBeInTheDocument();
  });

  it('sur la dernière étape, "Suivant" devient "Terminer"', async () => {
    await startTour();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[tourSteps.length - 1]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /terminer/i })).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: /suivant/i })).not.toBeInTheDocument();
  });

  it('"Terminer" ferme la visite', async () => {
    await startTour();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[tourSteps.length - 1]);
    await waitFor(() => screen.getByRole('button', { name: /terminer/i }));
    fireEvent.click(screen.getByRole('button', { name: /terminer/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /visite guidée/i })).not.toBeInTheDocument()
    );
  });

  it('"Passer" ferme la visite', async () => {
    await startTour();
    fireEvent.click(screen.getByRole('button', { name: /passer/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /visite guidée/i })).not.toBeInTheDocument()
    );
  });

  it('bouton X ferme la visite', async () => {
    await startTour();
    fireEvent.click(screen.getByLabelText(/fermer la visite/i));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /visite guidée/i })).not.toBeInTheDocument()
    );
  });

  it('Échap ferme la visite', async () => {
    await startTour();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /visite guidée/i })).not.toBeInTheDocument()
    );
  });
});

describe('Tour - persistance de l\'état', () => {
  it('relancer la visite revient à l\'étape 1', async () => {
    renderWithProvider(<HelpButton />);
    fireEvent.click(screen.getByLabelText(/lancer la visite/i));
    await waitFor(() => screen.getByRole('dialog', { name: /visite guidée/i }));
    // Aller à la dernière étape
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[tourSteps.length - 1]);
    await waitFor(() => screen.getByRole('button', { name: /terminer/i }));
    // Fermer
    fireEvent.click(screen.getByLabelText(/fermer la visite/i));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /visite guidée/i })).not.toBeInTheDocument()
    );
    // Relancer
    fireEvent.click(screen.getByLabelText(/lancer la visite/i));
    await waitFor(() => screen.getByRole('dialog', { name: /visite guidée/i }));
    expect(screen.getByText(`Étape 1 sur ${tourSteps.length}`)).toBeInTheDocument();
  });
});
