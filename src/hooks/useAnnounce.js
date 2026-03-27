import { useCallback } from 'react';

/**
 * Hook to announce messages to screen readers via an aria-live region.
 * The live region must exist in the DOM (see AppShell).
 */
export function useAnnounce() {
  return useCallback((message, priority = 'polite') => {
    const el = document.getElementById(
      priority === 'assertive' ? 'sr-announcer-assertive' : 'sr-announcer'
    );
    if (el) {
      el.textContent = '';
      // Force re-announcement by clearing then setting after a tick
      requestAnimationFrame(() => {
        el.textContent = message;
      });
    }
  }, []);
}
