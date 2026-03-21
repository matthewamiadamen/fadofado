import { createContext, useContext, useState, useCallback } from 'react';

const SettingsContext = createContext(null);

const SETTINGS_KEY = 'isl-app-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { dominantHand: 'right' };
}

function persistSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persistSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider');
  return ctx;
}
