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
    Element.prototype.scrollIntoView = jest.fn();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    document.querySelectorAll('.sidebar-desktop').forEach((el) => el.remove());
    delete Element.prototype.scrollIntoView;
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

  it('flèche droite puis flèche gauche naviguent entre les étapes', async () => {
    await startTour();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByText(tourSteps[1].title)).toBeInTheDocument());

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    await waitFor(() => expect(screen.getByText(tourSteps[0].title)).toBeInTheDocument());
  });

  it('positionne le spotlight et le tooltip autour de la cible trouvée', async () => {
    const target = document.createElement('div');
    target.className = 'sidebar-desktop';
    target.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 80,
      width: 120,
      height: 40,
      right: 200,
      bottom: 140,
    }));
    document.body.appendChild(target);

    await startTour();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
      await Promise.resolve();
      jest.advanceTimersByTime(260);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText(tourSteps[1].title)).toBeInTheDocument());

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center', inline: 'center' });
    await waitFor(() =>
      expect(document.querySelector('.tour-spotlight')).toHaveStyle({ top: '92px', left: '72px', width: '136px', height: '56px' })
    );
    expect(document.querySelector('.tour-tooltip')).not.toHaveClass('tour-tooltip-centered');
  });

  it('recalcule la position au resize et nettoie les listeners au démontage', async () => {
    const target = document.createElement('div');
    target.className = 'sidebar-desktop';
    target.getBoundingClientRect = jest
      .fn()
      .mockReturnValueOnce({ top: 100, left: 80, width: 120, height: 40, right: 200, bottom: 140 })
      .mockReturnValue({ top: 140, left: 110, width: 120, height: 40, right: 230, bottom: 180 });
    document.body.appendChild(target);

    const view = renderWithProvider(<HelpButton />);
    fireEvent.click(screen.getByLabelText(/lancer la visite/i));
    await waitFor(() => expect(screen.getByText(tourSteps[0].title)).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
      await Promise.resolve();
      jest.advanceTimersByTime(260);
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.resize(window);
    });
    await waitFor(() => expect(document.querySelector('.tour-spotlight')).toHaveStyle({ top: '132px' }));

    view.unmount();
    expect(document.querySelector('.tour-root')).not.toBeInTheDocument();
  });

  it('navigue vers la route requise avant de chercher la cible', async () => {
    const target = document.createElement('div');
    target.className = 'sidebar-desktop';
    target.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 80,
      width: 120,
      height: 40,
      right: 200,
      bottom: 140,
    }));
    document.body.appendChild(target);

    renderWithProvider(<HelpButton />, { route: '/login' });
    fireEvent.click(screen.getByLabelText(/lancer la visite/i));
    await waitFor(() => expect(screen.getByText(tourSteps[0].title)).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
      await Promise.resolve();
      jest.advanceTimersByTime(700);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText(tourSteps[1].title)).toBeInTheDocument());
    expect(target.scrollIntoView).toHaveBeenCalled();
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
