/**
 * Persistence layer for trained gesture data.
 * Uses IndexedDB (via idbStorage) with automatic one-time migration
 * from localStorage. All public functions are async.
 */

import { idbGet, idbSet, idbDelete, migrateFromLocalStorage } from './idbStorage';
import type { TrainingSample } from './knnClassifier';

// ── Types ───────────────────────────────────────────────────────────

/** A serialised sample stored in IDB (features as plain number[]). */
interface StoredSample {
  label: string;
  features: number[];
}

/** Per-gesture metadata in storage. */
export interface GestureEntry {
  samples: StoredSample[];
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Top-level storage schema. */
export interface GestureStore {
  version: number;
  gestures: Record<string, GestureEntry>;
  skippedGestures: string[];
}

/** Summary info for a stored gesture. */
export interface GestureSummary {
  id: string;
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Result returned by load/delete/import. */
export interface GestureLoadResult {
  samples: TrainingSample[];
  skippedGestures: string[];
  gestures: Record<string, GestureEntry>;
}

// ── Constants ───────────────────────────────────────────────────────

const STORAGE_KEY = 'trained-gestures';
const MIGRATION_FLAG = 'idb-migrated-gestures';
const CURRENT_VERSION = 1;

// ── Migration ───────────────────────────────────────────────────────

let migrationDone = false;

async function ensureMigrated(): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return;
    const migrated = await migrateFromLocalStorage(STORAGE_KEY);
    if (migrated !== null) {
      localStorage.setItem(MIGRATION_FLAG, '1');
    }
  } catch {
    // Migration failed — IDB will try again next load
  }
}

// ── Internal helpers ────────────────────────────────────────────────

async function readRaw(): Promise<GestureStore | null> {
  await ensureMigrated();
  try {
    return (await idbGet<GestureStore>(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

async function writeRaw(data: GestureStore): Promise<void> {
  await ensureMigrated();
  await idbSet(STORAGE_KEY, data);
}

function samplesToStore(
  samples: TrainingSample[],
  existingGestures: Record<string, GestureEntry> = {},
): Record<string, GestureEntry> {
  const grouped: Record<string, StoredSample[]> = {};
  for (const s of samples) {
    if (!grouped[s.label]) grouped[s.label] = [];
    grouped[s.label].push({
      label: s.label,
      features: Array.from(s.features),
    });
  }

  const now = new Date().toISOString();
  const gestures: Record<string, GestureEntry> = { ...existingGestures };

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

function storeToSamples(gestures: Record<string, GestureEntry>): TrainingSample[] {
  const samples: TrainingSample[] = [];
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

// ── Public API (all async) ──────────────────────────────────────────

export async function loadGestures(): Promise<GestureLoadResult | null> {
  const data = await readRaw();
  if (!data) return null;
  if (data.version !== CURRENT_VERSION) return null;
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

export async function saveGestures(
  samples: TrainingSample[],
  skippedGestures: string[] = [],
): Promise<void> {
  const existing = await readRaw();
  const existingGestures = existing && existing.version === CURRENT_VERSION
    ? existing.gestures
    : {};

  const gestures = samplesToStore(samples, existingGestures);

  for (const id of skippedGestures) {
    delete gestures[id];
  }

  await writeRaw({
    version: CURRENT_VERSION,
    gestures,
    skippedGestures,
  });
}

export async function deleteGesture(gestureId: string): Promise<GestureLoadResult | null> {
  const data = await readRaw();
  if (!data || data.version !== CURRENT_VERSION) return null;

  delete data.gestures[gestureId];
  data.skippedGestures = (data.skippedGestures || []).filter(
    (id) => id !== gestureId
  );

  await writeRaw(data);
  return {
    samples: storeToSamples(data.gestures),
    skippedGestures: data.skippedGestures,
    gestures: data.gestures,
  };
}

export async function clearAllGestures(): Promise<void> {
  try {
    await idbDelete(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function exportGestures(): Promise<GestureStore | null> {
  return readRaw();
}

export async function importGestures(data: unknown): Promise<GestureLoadResult> {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file format — expected a JSON object.');
  }
  const store = data as GestureStore;
  if (store.version !== CURRENT_VERSION) {
    throw new Error(
      `Incompatible version (found v${store.version}, expected v${CURRENT_VERSION}). Please retrain gestures.`
    );
  }
  if (!store.gestures || typeof store.gestures !== 'object') {
    throw new Error('Invalid file — no gesture data found.');
  }

  for (const [id, g] of Object.entries(store.gestures)) {
    if (!Array.isArray(g.samples)) {
      throw new Error(`Invalid gesture data for "${id}".`);
    }
    for (const s of g.samples) {
      if (!s.label || !Array.isArray(s.features)) {
        throw new Error(`Corrupted sample in gesture "${id}".`);
      }
    }
  }

  await writeRaw(store);

  return {
    samples: storeToSamples(store.gestures),
    skippedGestures: store.skippedGestures || [],
    gestures: store.gestures,
  };
}

export async function getGestureSummary(): Promise<GestureSummary[]> {
  const data = await readRaw();
  if (!data || data.version !== CURRENT_VERSION || !data.gestures) return [];

  return Object.entries(data.gestures).map(([id, g]) => ({
    id,
    sampleCount: g.sampleCount || g.samples.length,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));
}
