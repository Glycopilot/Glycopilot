import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import ErrorBoundary from '../../../components/ErrorBoundary';
import { devError } from '../../../lib/logger';

jest.mock('../../../lib/logger', () => ({
  devError: jest.fn(),
}));

function Broken({ shouldThrow = true }) {
  if (shouldThrow) throw new Error('Boom UI');
  return <div>Contenu restauré</div>;
}

describe('ErrorBoundary', () => {
  let consoleError;
  let reload;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    reload = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('affiche les enfants tant qu\'aucune erreur ne survient', () => {
    render(
      <ErrorBoundary>
        <div>Page normale</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Page normale')).toBeInTheDocument();
  });

  it('affiche le fallback et log l\'erreur capturée', () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Une erreur inattendue est survenue');
    expect(screen.getByText('Boom UI')).toBeInTheDocument();
    expect(devError).toHaveBeenCalledWith(
      'Uncaught error in tree:',
      expect.any(Error),
      expect.any(String)
    );
  });

  it('permet de réessayer après une erreur', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary>
        <Broken shouldThrow={false} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(screen.getByText('Contenu restauré')).toBeInTheDocument();
  });

  it('déclenche le rechargement de page depuis le fallback', () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /recharger la page/i }));

    expect(reload).toHaveBeenCalled();
  });
});
