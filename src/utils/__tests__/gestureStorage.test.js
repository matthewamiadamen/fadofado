import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

// Provide a minimal localStorage polyfill for Node
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

import {
  loadGestures,
  saveGestures,
  deleteGesture,
  clearAllGestures,
  exportGestures,
  importGestures,
  getGestureSummary,
} from '../gestureStorage';

// Use clearAllGestures to reset between tests (avoids IDB connection issues)
beforeEach(async () => {
  await clearAllGestures();
  localStorage.clear();
});

function makeSamples(label, count = 3) {
  return Array.from({ length: count }, () => ({
    label,
    features: new Float32Array([1, 2, 3]),
  }));
}

describe('gestureStorage CRUD', () => {
  it('returns null when nothing is stored', async () => {
    const result = await loadGestures();
    expect(result).toBeNull();
  });

  it('saves and loads gestures', async () => {
    const samples = [...makeSamples('wave'), ...makeSamples('peace')];
    await saveGestures(samples);

    const loaded = await loadGestures();
    expect(loaded).not.toBeNull();
    expect(loaded.samples.length).toBe(6);
    expect(loaded.samples[0].features).toBeInstanceOf(Float32Array);

    const labels = new Set(loaded.samples.map((s) => s.label));
    expect(labels.has('wave')).toBe(true);
    expect(labels.has('peace')).toBe(true);
  });

  it('deletes a single gesture', async () => {
    await saveGestures([...makeSamples('wave'), ...makeSamples('peace')]);

    const result = await deleteGesture('wave');
    expect(result).not.toBeNull();
    expect(result.samples.every((s) => s.label !== 'wave')).toBe(true);
    expect(result.samples.some((s) => s.label === 'peace')).toBe(true);
  });

  it('clears all gestures', async () => {
    await saveGestures(makeSamples('wave'));
    await clearAllGestures();
    const loaded = await loadGestures();
    expect(loaded).toBeNull();
  });

  it('returns gesture summary', async () => {
    await saveGestures([...makeSamples('wave', 5), ...makeSamples('peace', 3)]);
    const summary = await getGestureSummary();
    expect(summary.length).toBe(2);
    const wave = summary.find((s) => s.id === 'wave');
    expect(wave.sampleCount).toBe(5);
  });
});

describe('export / import', () => {
  it('round-trips through export and import', async () => {
    const original = [...makeSamples('wave'), ...makeSamples('peace')];
    await saveGestures(original);

    const exported = await exportGestures();
    expect(exported).not.toBeNull();
    expect(exported.version).toBe(1);

    await clearAllGestures();
    const result = await importGestures(exported);
    expect(result.samples.length).toBe(6);
  });

  it('rejects invalid import data', async () => {
    await expect(importGestures(null)).rejects.toThrow('Invalid file format');
    await expect(importGestures({ version: 99 })).rejects.toThrow('Incompatible version');
    await expect(importGestures({ version: 1 })).rejects.toThrow('no gesture data');
  });
});
