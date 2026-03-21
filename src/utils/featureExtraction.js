/**
 * Extracts normalised landmark features from a single hand.
 * Returns a Float32Array of 63 values (21 landmarks x 3 axes),
 * normalised relative to the wrist and scaled by the wrist-to-middle-finger-base distance.
 *
 * If mirrorX is true, the X-axis is flipped to support left-handed signers.
 * This allows a left-handed signer's data to match right-handed training data.
 */
function extractSingleHand(landmarks, mirrorX = false) {
  const wrist = landmarks[0];
  const ref = landmarks[9];
  const scale =
    Math.sqrt(
      (ref.x - wrist.x) ** 2 +
        (ref.y - wrist.y) ** 2 +
        (ref.z - wrist.z) ** 2
    ) || 1;
  const features = new Float32Array(63);
  const xFlip = mirrorX ? -1 : 1;
  for (let i = 0; i < 21; i++) {
    features[i * 3] = xFlip * (landmarks[i].x - wrist.x) / scale;
    features[i * 3 + 1] = (landmarks[i].y - wrist.y) / scale;
    features[i * 3 + 2] = (landmarks[i].z - wrist.z) / scale;
  }
  return features;
}

/**
 * Extract features for a one-handed sign (63 floats).
 * @param {Array} multiHandLandmarks - from MediaPipe
 * @param {boolean} mirrorX - flip X for left-handed support
 */
export function extractFeatures(multiHandLandmarks, mirrorX = false) {
  return extractSingleHand(multiHandLandmarks[0], mirrorX);
}

/**
 * Extract features for a two-handed sign (126 floats).
 * Sorts hands left-to-right by wrist X so the vector is consistent
 * regardless of detection order.
 * Returns null if fewer than 2 hands are present.
 * @param {Array} multiHandLandmarks - from MediaPipe
 * @param {boolean} mirrorX - flip X for left-handed support
 */
export function extractFeaturesTwoHands(multiHandLandmarks, mirrorX = false) {
  if (!multiHandLandmarks || multiHandLandmarks.length < 2) return null;

  // Sort by wrist x so left hand always comes first in the vector
  const sorted = [...multiHandLandmarks].sort(
    (a, b) => a[0].x - b[0].x
  );

  const left = extractSingleHand(sorted[0], mirrorX);
  const right = extractSingleHand(sorted[1], mirrorX);

  const combined = new Float32Array(126);
  // If mirrored, swap hand order (dominant/non-dominant roles reverse)
  if (mirrorX) {
    combined.set(right, 0);
    combined.set(left, 63);
  } else {
    combined.set(left, 0);
    combined.set(right, 63);
  }
  return combined;
}
