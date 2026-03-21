/**
 * Persistence for fingerspell (A-Z) MediaPipe training data.
 * Separate from the main gesture storage so the two don't conflict.
 */

const STORAGE_KEY = 'fingerspell-training';

/** Load saved fingerspell training samples. Returns { samples, skippedGestures } or null. */
export function loadFingerspellData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.samples)) return null;
    return {
      samples: data.samples.map((s) => ({
        label: s.label,
        features: new Float32Array(s.features),
      })),
      skippedGestures: data.skippedGestures || [],
    };
  } catch {
    return null;
  }
}

/** Save fingerspell training data. */
export function saveFingerspellData(samples, skippedGestures = []) {
  const data = {
    samples: samples.map((s) => ({
      label: s.label,
      features: Array.from(s.features),
    })),
    skippedGestures,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Check whether training data exists for at least one letter. */
export function hasFingerspellData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data && Array.isArray(data.samples) && data.samples.length > 0;
  } catch {
    return false;
  }
}

/** Get list of trained letter ids. */
export function getTrainedLetters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.samples)) return [];
    return [...new Set(data.samples.map((s) => s.label))];
  } catch {
    return [];
  }
}

/** Clear all fingerspell training data. */
export function clearFingerspellData() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
