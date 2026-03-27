/**
 * Default model loader for Lámha.
 *
 * Checks for a bundled pre-trained KNN model at /models/default-gestures.json.
 * If available, loads it so users can start playing immediately without training.
 *
 * To create a default model:
 * 1. Train all gestures in the app
 * 2. Use "Export Gestures" from My Signs
 * 3. Place the exported JSON at public/models/default-gestures.json
 *
 * The app will then offer a "Quick Start" option on the welcome screen.
 */

const MODEL_URL = '/models/default-gestures.json';

let defaultModelCache = null;
let checkDone = false;

/**
 * Check if a default pre-trained model is available.
 * Caches the result so subsequent calls are instant.
 */
export async function hasDefaultModel() {
  if (checkDone) return defaultModelCache !== null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(MODEL_URL, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    checkDone = true;
    // Verify it's actually JSON, not an HTML fallback from SPA routing
    const ct = resp.headers.get('content-type') || '';
    return resp.ok && ct.includes('json');
  } catch {
    checkDone = true;
    return false;
  }
}

/**
 * Load the default pre-trained model.
 * Returns the parsed gesture data in the same format as exportGestures(),
 * or null if unavailable.
 */
export async function loadDefaultModel() {
  if (defaultModelCache) return defaultModelCache;
  try {
    const resp = await fetch(MODEL_URL);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || !data.gestures) return null;
    defaultModelCache = data;
    return data;
  } catch {
    return null;
  }
}

/**
 * Convert raw default model data to the flat samples array used by KNN.
 */
export function defaultModelToSamples(data) {
  if (!data || !data.gestures) return { samples: [], skippedGestures: [] };
  const samples = [];
  for (const [, gestureData] of Object.entries(data.gestures)) {
    for (const s of gestureData.samples) {
      samples.push({
        label: s.label,
        features: new Float32Array(s.features),
      });
    }
  }
  return {
    samples,
    skippedGestures: data.skippedGestures || [],
  };
}
