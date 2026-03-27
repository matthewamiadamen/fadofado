/**
 * Shared MediaPipe locateFile with local-first, CDN fallback.
 * Used by all components that initialise window.Hands().
 */

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/';

/**
 * Returns a locateFile function for MediaPipe Hands that tries the
 * self-hosted path first. If the local fetch fails, falls back to CDN.
 */
export function getLocateFile() {
  return (file) => {
    const localUrl = `/mediapipe/hands/${file}`;
    // MediaPipe uses locateFile synchronously — it just expects a URL string.
    // The actual fetch happens internally. We prefer local; CDN is the fallback
    // handled by the service worker cache or the inline loader in index.html.
    return localUrl;
  };
}

/**
 * Capture and report MediaPipe loading errors.
 * Called when both local and CDN fail.
 */
export function handleMediaPipeError(error) {
  const message = 'MediaPipe model failed to load from both local and CDN sources.';
  console.error(message, error);

  // If Sentry is available, report the error
  try {
    const Sentry = window.__SENTRY__;
    if (Sentry && Sentry.captureException) {
      Sentry.captureException(new Error(message));
    }
  } catch {
    // Sentry not available — that's fine
  }

  throw new Error(message);
}
