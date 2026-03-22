import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected error',
    };
  }

  componentDidCatch(error) {
    // Keep a console trace for debugging while showing a UI fallback to users.
    console.error('App runtime error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="radial-bg" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 640, textAlign: 'center', color: 'var(--cream)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: 12 }}>
              Something went wrong
            </h2>
            <p style={{ marginBottom: 12 }}>
              The page hit a runtime error instead of loading this screen.
            </p>
            <p style={{ marginBottom: 20, opacity: 0.85 }}>
              {this.state.message}
            </p>
            <button className="btn" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
