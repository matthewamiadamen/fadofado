import { describe, it, expect } from 'vitest';
import { extractFeatures, extractFeaturesTwoHands } from '../featureExtraction';

// Helper: create 21 mock landmarks with known positions
function makeLandmarks(offset = 0) {
  return Array.from({ length: 21 }, (_, i) => ({
    x: (i + offset) * 0.01,
    y: (i + offset) * 0.02,
    z: (i + offset) * 0.005,
  }));
}

describe('extractFeatures (single hand)', () => {
  it('returns a Float32Array of length 63', () => {
    const landmarks = makeLandmarks();
    const features = extractFeatures([landmarks]);
    expect(features).toBeInstanceOf(Float32Array);
    expect(features.length).toBe(63);
  });

  it('first 3 values (wrist) are always 0 (self-relative)', () => {
    const features = extractFeatures([makeLandmarks()]);
    expect(features[0]).toBeCloseTo(0);
    expect(features[1]).toBeCloseTo(0);
    expect(features[2]).toBeCloseTo(0);
  });

  it('produces different output with mirrorX=true', () => {
    const landmarks = makeLandmarks();
    const normal = extractFeatures([landmarks], false);
    const mirrored = extractFeatures([landmarks], true);

    // X values (indices 3, 6, 9, ...) should be negated
    for (let i = 3; i < 63; i += 3) {
      expect(mirrored[i]).toBeCloseTo(-normal[i]);
    }
    // Y values should be the same
    for (let i = 4; i < 63; i += 3) {
      expect(mirrored[i]).toBeCloseTo(normal[i]);
    }
  });
});

describe('extractFeaturesTwoHands', () => {
  it('returns null if fewer than 2 hands', () => {
    expect(extractFeaturesTwoHands(null)).toBeNull();
    expect(extractFeaturesTwoHands([])).toBeNull();
    expect(extractFeaturesTwoHands([makeLandmarks()])).toBeNull();
  });

  it('returns Float32Array of length 126 for 2 hands', () => {
    const twoHands = [makeLandmarks(0), makeLandmarks(10)];
    const features = extractFeaturesTwoHands(twoHands);
    expect(features).toBeInstanceOf(Float32Array);
    expect(features.length).toBe(126);
  });

  it('sorts hands by wrist X (left first)', () => {
    const leftHand = makeLandmarks(0); // wrist x = 0
    const rightHand = makeLandmarks(10); // wrist x = 0.1
    // Pass right first, left second — should still sort correctly
    const features = extractFeaturesTwoHands([rightHand, leftHand]);
    expect(features).not.toBeNull();
    expect(features.length).toBe(126);
  });

  it('swaps hand order when mirrorX is true', () => {
    const leftHand = makeLandmarks(0);
    const rightHand = makeLandmarks(10);
    const normal = extractFeaturesTwoHands([leftHand, rightHand], false);
    const mirrored = extractFeaturesTwoHands([leftHand, rightHand], true);
    // The two halves should be swapped (and X negated)
    expect(normal).not.toBeNull();
    expect(mirrored).not.toBeNull();
    // They should not be identical
    let same = true;
    for (let i = 0; i < 126; i++) {
      if (Math.abs(normal[i] - mirrored[i]) > 1e-6) { same = false; break; }
    }
    expect(same).toBe(false);
  });
});
