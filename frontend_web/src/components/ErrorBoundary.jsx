import React from 'react';
import { devError } from '../lib/logger';
import { AlertOctagon, RefreshCw, ArrowLeft } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    devError('Uncaught error in tree:', error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  reload = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="error-boundary-wrapper">
        <div className="error-boundary-fallback" role="alert">
          <div className="eb-icon-wrap">
            <AlertOctagon size={48} strokeWidth={1.5} color="#EF4444" />
          </div>
          <h1>Une erreur inattendue est survenue</h1>
          <p>L'application n'a pas pu charger correctement cette page. Veuillez réessayer ou retourner à l'accueil.</p>
          
          <div className="error-boundary-actions">
            <button type="button" className="eb-btn-primary" onClick={this.reset}>
              <RefreshCw size={16} />
              <span>Réessayer</span>
            </button>
            <button type="button" className="eb-btn-secondary" onClick={this.reload}>
              <ArrowLeft size={16} />
              <span>Retour à l'accueil</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
