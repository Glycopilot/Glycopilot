import React from 'react';
import { devError } from '../lib/logger';
import { ERROR_PAGE_COPY } from '../lib/errorPageCopy';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import logo from '../assets/glycopilot.png';

const IS_DEV = process.env.NODE_ENV !== 'production';

export default class ErrorBoundary extends React.Component {
  state = { error: null, showDetails: false };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    devError('Uncaught error in tree:', error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null, showDetails: false });
  };

  reload = () => {
    window.location.reload();
  };

  goHome = () => {
    window.location.href = '/home';
  };

  toggleDetails = () => {
    this.setState((s) => ({ showDetails: !s.showDetails }));
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { title, description, retryLabel, homeLabel, devDetailsLabel } = ERROR_PAGE_COPY;
    const err = this.state.error;

    return (
      <div className="error-boundary-wrapper">
        <div className="error-boundary-fallback" role="alert" aria-live="polite">
          <div className="eb-brand">
            <img src={logo} alt="" className="eb-logo" aria-hidden="true" />
          </div>
          <h1>{title}</h1>
          <p>{description}</p>

          {IS_DEV && (
            <div className="eb-dev-block">
              <button
                type="button"
                className="eb-dev-toggle"
                onClick={this.toggleDetails}
                aria-expanded={this.state.showDetails}
              >
                {devDetailsLabel}
              </button>
              {this.state.showDetails && (
                <pre className="eb-dev-pre">{err?.message || String(err)}</pre>
              )}
            </div>
          )}

          <div className="error-boundary-actions">
            <button type="button" className="eb-btn-primary" onClick={this.reload}>
              <RefreshCw size={16} aria-hidden="true" />
              <span>{retryLabel}</span>
            </button>
            <button type="button" className="eb-btn-secondary" onClick={this.goHome}>
              <LayoutDashboard size={16} aria-hidden="true" />
              <span>{homeLabel}</span>
            </button>
          </div>
          <p className="eb-support-hint">
            Référence : {new Date().toISOString().slice(0, 16).replace('T', ' ')}
          </p>
        </div>
      </div>
    );
  }
}
