/**
 * Persistence layer for trained gesture data.
 * Uses localStorage with JSON serialization. Float32Arrays are stored as
 * plain arrays and reconstituted on load. The module exposes a simple API
 * so the backend (IndexedDB, server, etc.) can be swapped later.
 *
 * Storage schema (version 1):
 * {
 *   version: 1,
 *   gestures: {
 *     [gestureId]: {
 *       samples: Array<{ label, features: number[] }>,
 *       sampleCount: number,
 *       createdAt: ISO string,
 *       updatedAt: ISO string,
 *     }
 *   },
 *   skippedGestures: string[],
 * }
 */

const STORAGE_KEY = 'trained-gestures';
const CURRENT_VERSION = 1;

// ── Internal helpers ──────────────────────────────────────────────────

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeRaw(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      throw new Error('Storage quota exceeded — please clear some gesture data and try again.');
    }
    throw e;
  }
}

function emptyStore() {
  return { version: CURRENT_VERSION, gestures: {}, skippedGestures: [] };
}

/** Convert a flat training data array into the grouped storage format. */
function samplesToStore(samples, existingGestures = {}) {
  const grouped = {};
  for (const s of samples) {
    if (!grouped[s.label]) grouped[s.label] = [];
    grouped[s.label].push({
      label: s.label,
      features: Array.from(s.features),
    });
  }

  const now = new Date().toISOString();
  const gestures = { ...existingGestures };

  for (const [label, sampleList] of Object.entries(grouped)) {
    const existing = gestures[label];
    gestures[label] = {
      samples: sampleList,
      sampleCount: sampleList.length,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
  }
  return gestures;
}

/** Convert storage format back to a flat array with Float32Array features. */
function storeToSamples(gestures) {
  const samples = [];
  for (const [, gestureData] of Object.entries(gestures)) {
    for (const s of gestureData.samples) {
      samples.push({
        label: s.label,
        features: new Float32Array(s.features),
      });
    }
  }
  return samples;
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Load saved gesture data from storage.
 * Returns { samples: Array<{label, features: Float32Array}>, skippedGestures: string[], gestures: object } or null.
 */
export function loadGestures() {
  const data = readRaw();
  if (!data) return null;

  if (data.version !== CURRENT_VERSION) {
    return null;
  }

  if (!data.gestures || typeof data.gestures !== 'object') return null;

  try {
    const samples = storeToSamples(data.gestures);
    return {
      samples,
      skippedGestures: data.skippedGestures || [],
      gestures: data.gestures,
    };
  } catch {
    return null;
  }
}

/**
 * Save training data to storage. Merges with existing gesture data —
 * gestures present in `samples` are overwritten, others are preserved.
 * @param {Array<{label:string, features:Float32Array}>} samples
 * @param {string[]} skippedGestures
 */
export function saveGestures(samples, skippedGestures = []) {
  const existing = readRaw();
  const existingGestures = existing && existing.version === CURRENT_VERSION
    ? existing.gestures
    : {};

  const gestures = samplesToStore(samples, existingGestures);

  // Remove skipped gestures from stored gestures
  for (const id of skippedGestures) {
    delete gestures[id];
  }

  writeRaw({
    version: CURRENT_VERSION,
    gestures,
    skippedGestures,
  });
}

/**
 * Delete a single gesture from storage by id.
 * Returns the updated store or null if nothing was stored.
 */
export function deleteGesture(gestureId) {
  const data = readRaw();
  if (!data || data.version !== CURRENT_VERSION) return null;

  delete data.gestures[gestureId];

  // Also remove from skipped if present
  data.skippedGestures = (data.skippedGestures || []).filter(
    (id) => id !== gestureId
  );

  writeRaw(data);
  return {
    samples: storeToSamples(data.gestures),
    skippedGestures: data.skippedGestures,
    gestures: data.gestures,
  };
}

/** Clear all saved gesture data. */
export function clearAllGestures() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Export gesture data as a JSON-serializable object (for file download).
 * Returns the raw storage object or null.
 */
export function exportGestures() {
  return readRaw();
}

/**
 * Import gesture data from a parsed JSON object.
 * Validates structure and version before writing.
 * @returns {{ samples, skippedGestures, gestures }} on success
 * @throws {Error} on validation failure
 */
export function importGestures(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file format — expected a JSON object.');
  }
  if (data.version !== CURRENT_VERSION) {
    throw new Error(
      `Incompatible version (found v${data.version}, expected v${CURRENT_VERSION}). Please retrain gestures.`
    );
  }
  if (!data.gestures || typeof data.gestures !== 'object') {
    throw new Error('Invalid file — no gesture data found.');
  }

  // Validate each gesture has samples array
  for (const [id, g] of Object.entries(data.gestures)) {
    if (!Array.isArray(g.samples)) {
      throw new Error(`Invalid gesture data for "${id}".`);
    }
    for (const s of g.samples) {
      if (!s.label || !Array.isArray(s.features)) {
        throw new Error(`Corrupted sample in gesture "${id}".`);
      }
    }
  }

  writeRaw(data);

  return {
    samples: storeToSamples(data.gestures),
    skippedGestures: data.skippedGestures || [],
    gestures: data.gestures,
  };
}

/**
 * Get summary info about stored gestures (for display).
 * Returns an array of { id, sampleCount, createdAt, updatedAt }.
 */
export function getGestureSummary() {
  const data = readRaw();
  if (!data || data.version !== CURRENT_VERSION || !data.gestures) return [];

  return Object.entries(data.gestures).map(([id, g]) => ({
    id,
    sampleCount: g.sampleCount || g.samples.length,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));
}
