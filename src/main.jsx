import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './components/Toast';
import AppErrorBoundary from './components/AppErrorBoundary';
import './index.css';

// Initialise Sentry error tracking (production only, guarded by env var)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE, // 'development' or 'production'
    tracesSampleRate: 0.1,
    // Only send errors in production to avoid noise during development
    enabled: import.meta.env.PROD,
  });
}

// Expose Sentry on window for use by non-React code (e.g., mediapipeLoader)
window.__SENTRY__ = Sentry;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <ToastProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
