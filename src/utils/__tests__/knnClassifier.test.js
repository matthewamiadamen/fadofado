import { describe, it, expect } from 'vitest';
import { euclidean, knnPredict } from '../knnClassifier';

describe('euclidean', () => {
  it('returns 0 for identical vectors', () => {
    expect(euclidean([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('computes correct distance for simple case', () => {
    // distance between (0,0) and (3,4) = 5
    expect(euclidean([0, 0], [3, 4])).toBe(5);
  });

  it('works with Float32Arrays', () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(euclidean(a, b)).toBeCloseTo(Math.SQRT2);
  });
});

describe('knnPredict', () => {
  const trainingData = [
    // 5 samples of "wave" at origin-ish
    ...Array.from({ length: 5 }, (_, i) => ({
      label: 'wave',
      features: new Float32Array([i * 0.01, 0, 0]),
    })),
    // 5 samples of "peace" far away
    ...Array.from({ length: 5 }, (_, i) => ({
      label: 'peace',
      features: new Float32Array([10 + i * 0.01, 10, 10]),
    })),
  ];

  it('predicts the closest class', () => {
    const query = new Float32Array([0.02, 0, 0]); // near "wave"
    const result = knnPredict(query, trainingData, 5);
    expect(result.label).toBe('wave');
    expect(result.confidence).toBe(1); // all 5 neighbours are "wave"
  });

  it('returns null label when insufficient training data', () => {
    const query = new Float32Array([0, 0, 0]);
    const result = knnPredict(query, trainingData.slice(0, 2), 5);
    expect(result.label).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('filters by feature length (one-handed vs two-handed)', () => {
    const mixedData = [
      ...trainingData,
      // 6-element vectors (simulating two-handed)
      ...Array.from({ length: 5 }, () => ({
        label: 'clap',
        features: new Float32Array([0, 0, 0, 0, 0, 0]),
      })),
    ];
    // Query with 3-element vector should only match 3-element training data
    const query = new Float32Array([0.02, 0, 0]);
    const result = knnPredict(query, mixedData, 5);
    expect(result.label).toBe('wave');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('returns correct confidence for mixed votes', () => {
    // Create data where k=3 gives 2 votes A, 1 vote B
    const data = [
      { label: 'A', features: new Float32Array([0]) },
      { label: 'A', features: new Float32Array([0.1]) },
      { label: 'B', features: new Float32Array([0.2]) },
    ];
    const result = knnPredict(new Float32Array([0.05]), data, 3);
    expect(result.label).toBe('A');
    expect(result.confidence).toBeCloseTo(2 / 3);
  });
});
