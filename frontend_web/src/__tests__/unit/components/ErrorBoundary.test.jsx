import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import ErrorBoundary from '../../../components/ErrorBoundary';
import { devError } from '../../../lib/logger';
import { ERROR_PAGE_COPY } from '../../../lib/errorPageCopy';

jest.mock('../../../lib/logger', () => ({
  devError: jest.fn(),
}));

function Broken({ shouldThrow = true }) {
  if (shouldThrow) throw new Error('Boom UI');
  return <div>Contenu restauré</div>;
}

describe('ErrorBoundary', () => {
  let consoleError;
  const originalLocation = window.location;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    delete window.location;
    window.location = { ...originalLocation, reload: jest.fn(), href: '' };
  });

  afterEach(() => {
    consoleError.mockRestore();
    window.location = originalLocation;
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

    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_PAGE_COPY.title);
    expect(devError).toHaveBeenCalledWith(
      'Uncaught error in tree:',
      expect.any(Error),
      expect.any(String)
    );
  });

  it('affiche les détails techniques en développement', () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: ERROR_PAGE_COPY.devDetailsLabel }));
    expect(screen.getByText('Boom UI')).toBeInTheDocument();
  });

  it('déclenche le rechargement de page depuis le fallback', () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: ERROR_PAGE_COPY.retryLabel }));

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('redirige vers le tableau de bord', () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: ERROR_PAGE_COPY.homeLabel }));

    expect(window.location.href).toBe('/home');
  });
});
