/**
 * Euclidean distance between two equal-length numeric arrays.
 */
export function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/**
 * K-nearest-neighbours prediction.
 * Only compares against training samples whose feature vector length
 * matches the query, so one-handed (63) and two-handed (126) data coexist safely.
 *
 * @param {Float32Array} features  — query feature vector
 * @param {Array<{label:string, features:Float32Array}>} trainingData
 * @param {number} k — neighbour count (default 5)
 * @returns {{label:string|null, confidence:number}}
 */
export function knnPredict(features, trainingData, k = 5) {
  const compatibleData = trainingData.filter(
    (s) => s.features.length === features.length
  );
  if (compatibleData.length < k) return { label: null, confidence: 0 };
  const distances = compatibleData
    .map((s) => ({ label: s.label, dist: euclidean(features, s.features) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k);
  const votes = {};
  distances.forEach((n) => {
    votes[n.label] = (votes[n.label] || 0) + 1;
  });
  const [label, count] = Object.entries(votes).sort(
    (a, b) => b[1] - a[1]
  )[0];
  return { label, confidence: count / k };
}
