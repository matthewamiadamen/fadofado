/**
 * Persistence for fingerspell (A-Z) MediaPipe training data.
 * Uses IndexedDB (via idbStorage) with one-time migration from localStorage.
 * All public functions are async.
 */

import { idbGet, idbSet, idbDelete, migrateFromLocalStorage } from './idbStorage';

const STORAGE_KEY = 'fingerspell-training';
const MIGRATION_FLAG = 'idb-migrated-fingerspell';

let migrationDone = false;

async function ensureMigrated() {
  if (migrationDone) return;
  migrationDone = true;
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return;
    const migrated = await migrateFromLocalStorage(STORAGE_KEY);
    if (migrated !== null) {
      localStorage.setItem(MIGRATION_FLAG, '1');
    }
  } catch {
    // ignore
  }
}

async function readRaw() {
  await ensureMigrated();
  try {
    return (await idbGet(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

/** Load saved fingerspell training samples. Returns { samples, skippedGestures } or null. */
export async function loadFingerspellData() {
  const data = await readRaw();
  if (!data || !Array.isArray(data.samples)) return null;
  return {
    samples: data.samples.map((s) => ({
      label: s.label,
      features: new Float32Array(s.features),
    })),
    skippedGestures: data.skippedGestures || [],
  };
}

/** Save fingerspell training data. */
export async function saveFingerspellData(samples, skippedGestures = []) {
  await ensureMigrated();
  const data = {
    samples: samples.map((s) => ({
      label: s.label,
      features: Array.from(s.features),
    })),
    skippedGestures,
  };
  await idbSet(STORAGE_KEY, data);
}

/** Check whether training data exists for at least one letter. */
export async function hasFingerspellData() {
  const data = await readRaw();
  return data && Array.isArray(data.samples) && data.samples.length > 0;
}

/** Get list of trained letter ids. */
export async function getTrainedLetters() {
  const data = await readRaw();
  if (!data || !Array.isArray(data.samples)) return [];
  return [...new Set(data.samples.map((s) => s.label))];
}

/** Clear all fingerspell training data. */
export async function clearFingerspellData() {
  try { await idbDelete(STORAGE_KEY); } catch { /* ignore */ }
}
