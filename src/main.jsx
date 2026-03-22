import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsProvider } from './contexts/SettingsContext';
import AppErrorBoundary from './components/AppErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SettingsProvider>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </SettingsProvider>
  </React.StrictMode>
);
