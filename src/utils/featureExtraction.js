/**
 * Extracts normalised landmark features from a single hand.
 * Returns a Float32Array of 63 values (21 landmarks x 3 axes),
 * normalised relative to the wrist and scaled by the wrist-to-middle-finger-base distance.
 */
function extractSingleHand(landmarks) {
  const wrist = landmarks[0];
  const ref = landmarks[9];
  const scale =
    Math.sqrt(
      (ref.x - wrist.x) ** 2 +
        (ref.y - wrist.y) ** 2 +
        (ref.z - wrist.z) ** 2
    ) || 1;
  const features = new Float32Array(63);
  for (let i = 0; i < 21; i++) {
    features[i * 3] = (landmarks[i].x - wrist.x) / scale;
    features[i * 3 + 1] = (landmarks[i].y - wrist.y) / scale;
    features[i * 3 + 2] = (landmarks[i].z - wrist.z) / scale;
  }
  return features;
}

/**
 * Extract features for a one-handed gesture (63 floats).
 */
export function extractFeatures(multiHandLandmarks) {
  return extractSingleHand(multiHandLandmarks[0]);
}

/**
 * Extract features for a two-handed gesture (126 floats).
 * Sorts hands left-to-right by wrist X so the vector is consistent
 * regardless of detection order.
 * Returns null if fewer than 2 hands are present.
 */
export function extractFeaturesTwoHands(multiHandLandmarks) {
  if (!multiHandLandmarks || multiHandLandmarks.length < 2) return null;

  // Sort by wrist x so left hand always comes first in the vector
  const sorted = [...multiHandLandmarks].sort(
    (a, b) => a[0].x - b[0].x
  );

  const left = extractSingleHand(sorted[0]);
  const right = extractSingleHand(sorted[1]);

  const combined = new Float32Array(126);
  combined.set(left, 0);
  combined.set(right, 63);
  return combined;
}
