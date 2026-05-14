import React from 'react';
import { devError } from '../lib/logger';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    devError('Uncaught error in tree:', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="error-boundary-fallback" role="alert">
        <h1>Une erreur inattendue est survenue</h1>
        <p>L'application n'a pas pu afficher cette page. Vous pouvez réessayer ou recharger.</p>
        <pre>{String(this.state.error?.message ?? this.state.error)}</pre>
        <div className="error-boundary-actions">
          <button type="button" onClick={this.reset}>Réessayer</button>
          <button type="button" onClick={() => window.location.reload()}>Recharger la page</button>
        </div>
      </div>
    );
  }
}
