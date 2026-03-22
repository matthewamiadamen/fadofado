import { useState, useRef, useEffect, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { extractFeatures, extractFeaturesTwoHands } from '../utils/featureExtraction';
import { euclidean } from '../utils/knnClassifier';
import { knnPredict } from '../utils/knnClassifier';
import { GESTURES } from '../gestures';
import { useSettings } from '../contexts/SettingsContext';
import { SignLabel } from './SignCard';
import GestureAnimation from './GestureAnimation';
import './TrainingScreen.css';

const SAMPLES_REQUIRED = 20;
const SAMPLE_INTERVAL_MS = 80;
const CONSISTENCY_THRESHOLD = 1.8;

// Hand landmark connections for drawing skeleton
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// ── Quality validation helpers ────────────────────────────────────────

/** Compute mean feature vector from an array of Float32Arrays. */
function computeMean(samples) {
  const len = samples[0].length;
  const mean = new Float32Array(len);
  for (const s of samples) {
    for (let i = 0; i < len; i++) mean[i] += s[i];
  }
  for (let i = 0; i < len; i++) mean[i] /= samples.length;
  return mean;
}

/** Average euclidean distance of each sample from the mean. */
function consistencyScore(samples) {
  const mean = computeMean(samples);
  let total = 0;
  for (const s of samples) total += euclidean(s, mean);
  return total / samples.length;
}

/** Pick n random items from an array. */
function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Separation check: predict 5 random new samples against existing training
 * data (excluding the new batch). If >3 of 5 are misclassified the gesture
 * is too similar to an already-trained one. Uses k=7 for a fairer vote.
 * Requires at least 30 existing samples to run — with fewer there is not
 * enough data to make a reliable separation judgement.
 */
function separationCheck(newBatch, existingData) {
  if (existingData.length < 30) return true; // not enough prior data
  const probes = pickRandom(newBatch, 5);
  let misclassified = 0;
  for (const probe of probes) {
    const prediction = knnPredict(probe.features, existingData, 7);
    if (prediction.label && prediction.label !== probe.label) {
      misclassified++;
    }
  }
  return misclassified <= 3;
}

// ───────────────────────────────────────────────────────────────────────

export default function TrainingScreen({ trainingDataRef, existingGestures = [], signsList, onComplete, onBack }) {
  const signs = Array.isArray(signsList) ? signsList : GESTURES;
  const { settings } = useSettings();
  const mirrorX = settings.dominantHand === 'left';
  const [gestureIdx, setGestureIdx] = useState(0);
  const [samplesCollected, setSamplesCollected] = useState(0);
  const [recording, setRecording] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [bothHandsDetected, setBothHandsDetected] = useState(false);
  const [flash, setFlash] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [skippedGestures, setSkippedGestures] = useState([]);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg }
  const [steadiness, setSteadiness] = useState(1); // 0–1, 1 = perfectly still

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const landmarksRef = useRef(null);
  const recordingRef = useRef(false);
  const intervalRef = useRef(null);
  const collectedRef = useRef([]);
  const gestureIdxRef = useRef(0);
  const skippedGesturesRef = useRef([]);
  const onCompleteRef = useRef(onComplete);
  const batchRef = useRef([]); // samples for current gesture only
  const runningMeanRef = useRef(null);
  const sepFailCountRef = useRef(0); // consecutive separation failures for current gesture
  const signsRef = useRef(signs);
  useEffect(() => { signsRef.current = signs; }, [signs]);
  const mirrorXRef = useRef(mirrorX);
  useEffect(() => { mirrorXRef.current = mirrorX; }, [mirrorX]);

  const gesture = signs[gestureIdx] || null;
  const needsTwoHands = Boolean(gesture?.twoHanded);

  // Keep refs in sync
  useEffect(() => { gestureIdxRef.current = gestureIdx; }, [gestureIdx]);
  useEffect(() => { skippedGesturesRef.current = skippedGestures; }, [skippedGestures]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Draw hand landmarks on the canvas overlay
  const drawLandmarks = useCallback((allHands, width, height) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    for (const landmarks of allHands) {
      ctx.strokeStyle = '#c9a84c';
      ctx.lineWidth = 1.5;
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
        ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
        ctx.stroke();
      }
      ctx.fillStyle = '#c9a84c';
      for (const lm of landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // Stable ref for the onResults handler
  const onResultsRef = useRef(null);
  useEffect(() => {
    onResultsRef.current = (results) => {
      const hasHands = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
      const hasTwoHands = results.multiHandLandmarks && results.multiHandLandmarks.length >= 2;

      if (hasHands) {
        setHandDetected(true);
        setBothHandsDetected(hasTwoHands);
        landmarksRef.current = results.multiHandLandmarks;
        drawLandmarks(results.multiHandLandmarks, 320, 240);
      } else {
        setHandDetected(false);
        setBothHandsDetected(false);
        landmarksRef.current = null;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
  }, [drawLandmarks]);

  // Mounted flag prevents stale onFrame calls after StrictMode cleanup
  const mountedRef = useRef(false);

  if (!signs || signs.length === 0 || !gesture) {
    return (
      <div className="training radial-bg">
        <div className="training-error">
          <p>No trainable signs are available right now.</p>
          <button className="btn" onClick={onBack}>Back</button>
        </div>
      </div>
    );
  }

  // Initialise MediaPipe Hands + Camera (runs once)
  useEffect(() => {
    mountedRef.current = true;
    const video = videoRef.current;
    if (!video) return;

    try {
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      hands.onResults((results) => {
        if (onResultsRef.current) onResultsRef.current(results);
      });
      handsRef.current = hands;

      const camera = new Camera(video, {
        onFrame: async () => {
          if (!mountedRef.current) return;
          try {
            if (handsRef.current) await handsRef.current.send({ image: video });
          } catch { /* closed during StrictMode teardown */ }
        },
        width: 320,
        height: 240,
      });
      camera.start().catch(() => {
        setCameraError('Camera access denied. Please allow camera permissions and reload.');
      });
      cameraRef.current = camera;
    } catch {
      setCameraError('Unable to start hand tracking. Please reload and try again.');
    }

    return () => {
      mountedRef.current = false;
      if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
      if (video && video.srcObject) video.srcObject.getTracks().forEach((t) => t.stop());
      if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
    };
  }, []);

  // ── Quality validation after recording completes ───────────────────

  const validateAndAdvance = useCallback(() => {
    const batch = batchRef.current;
    const featureArrays = batch.map((s) => s.features);

    // Step 1: Consistency check
    const avgDist = consistencyScore(featureArrays);
    if (avgDist > CONSISTENCY_THRESHOLD) {
      // Reject — remove this batch from collectedRef
      const label = batch[0].label;
      collectedRef.current = collectedRef.current.filter((s) => s.label !== label || !batch.includes(s));
      batchRef.current = [];
      runningMeanRef.current = null;
      setSamplesCollected(0);
      setSteadiness(1);
      setFeedback({ type: 'error', msg: 'Too much movement detected \u2014 hold the gesture still and try again' });
      return;
    }

    // Step 2: Separation check against previously trained gestures
    // Override: bypass separation after 2 consecutive failures for the same gesture
    const existingData = collectedRef.current.filter((s) => !batch.includes(s));
    const bypassSeparation = sepFailCountRef.current >= 2;
    if (!bypassSeparation && existingData.length >= 5 && !separationCheck(batch, existingData)) {
      const label = batch[0].label;
      collectedRef.current = collectedRef.current.filter((s) => s.label !== label || !batch.includes(s));
      batchRef.current = [];
      runningMeanRef.current = null;
      setSamplesCollected(0);
      setSteadiness(1);
      sepFailCountRef.current += 1;
      const attemptsLeft = 2 - sepFailCountRef.current;
      const suffix = attemptsLeft > 0
        ? ` (${attemptsLeft} more attempt${attemptsLeft > 1 ? 's' : ''} before override)`
        : ' \u2014 next attempt will be accepted automatically';
      setFeedback({ type: 'error', msg: `Gesture too similar to a previous one \u2014 make the shape more distinct and try again${suffix}` });
      return;
    }

    // Checks passed (or override triggered)
    const overrideUsed = bypassSeparation && existingData.length >= 5;
    sepFailCountRef.current = 0;
    batchRef.current = [];
    runningMeanRef.current = null;
    setSteadiness(1);
    setFeedback({
      type: overrideUsed ? 'warn' : 'success',
      msg: overrideUsed ? 'Accepted with override \u2014 gesture saved' : 'Gesture captured!',
    });
    setFlash(true);
    setTimeout(() => setFlash(false), 600);

    // Advance after 800ms
    const nextIdx = gestureIdxRef.current + 1;
    if (nextIdx >= signs.length) {
      setTimeout(() => {
        onCompleteRef.current(collectedRef.current, skippedGesturesRef.current);
      }, 800);
    } else {
      setTimeout(() => {
        gestureIdxRef.current = nextIdx;
        setGestureIdx(nextIdx);
        setSamplesCollected(0);
        setFeedback(null);
      }, 800);
    }
  }, []);

  // ── Single-press auto-recording ────────────────────────────────────

  const startRecording = useCallback(() => {
    if (recordingRef.current) return;
    recordingRef.current = true;
    setRecording(true);
    setSamplesCollected(0);
    setFeedback(null);
    batchRef.current = [];
    runningMeanRef.current = null;

    let localCount = 0;

    intervalRef.current = setInterval(() => {
      if (!landmarksRef.current) return;

      const currentGesture = signsRef.current[gestureIdxRef.current];
      let features;

      if (currentGesture.twoHanded) {
        features = extractFeaturesTwoHands(landmarksRef.current, mirrorXRef.current);
        if (!features) return; // need both hands — skip this tick
      } else {
        features = extractFeatures(landmarksRef.current, mirrorXRef.current);
      }

      // Live steadiness: distance from running mean
      if (runningMeanRef.current) {
        const dist = euclidean(features, runningMeanRef.current);
        // Map distance to 0–1 where 0 = very unsteady, 1 = perfectly still
        const s = Math.max(0, Math.min(1, 1 - dist / CONSISTENCY_THRESHOLD));
        setSteadiness(s);
        // Update running mean incrementally
        const mean = runningMeanRef.current;
        const n = localCount;
        for (let i = 0; i < features.length; i++) {
          mean[i] = (mean[i] * n + features[i]) / (n + 1);
        }
      } else {
        runningMeanRef.current = new Float32Array(features);
        setSteadiness(1);
      }

      const sample = { label: currentGesture.id, features };
      collectedRef.current.push(sample);
      batchRef.current.push(sample);
      localCount++;
      setSamplesCollected(localCount);

      if (localCount >= SAMPLES_REQUIRED) {
        clearInterval(intervalRef.current);
        recordingRef.current = false;
        setRecording(false);
        validateAndAdvance();
      }
    }, SAMPLE_INTERVAL_MS);
  }, [validateAndAdvance]);

  const cancelRecording = useCallback(() => {
    if (!recordingRef.current) return;
    clearInterval(intervalRef.current);
    recordingRef.current = false;
    setRecording(false);
    // Remove partially collected batch from collectedRef
    for (const s of batchRef.current) {
      const idx = collectedRef.current.indexOf(s);
      if (idx !== -1) collectedRef.current.splice(idx, 1);
    }
    batchRef.current = [];
    runningMeanRef.current = null;
    setSamplesCollected(0);
    setSteadiness(1);
  }, []);

  // Ref to keep existingGestures accessible in callbacks
  const existingGesturesRef = useRef(existingGestures);
  useEffect(() => { existingGesturesRef.current = existingGestures; }, [existingGestures]);

  const handleSkip = useCallback(() => {
    cancelRecording();
    sepFailCountRef.current = 0;
    const currentId = signsRef.current[gestureIdxRef.current].id;

    // Only truly skip (exclude from game) if no existing saved data
    let updated = skippedGesturesRef.current;
    if (!existingGesturesRef.current.includes(currentId)) {
      updated = [...updated, currentId];
      skippedGesturesRef.current = updated;
      setSkippedGestures(updated);
    }
    setFeedback(null);

    const nextIdx = gestureIdxRef.current + 1;
    if (nextIdx >= signs.length) {
      onCompleteRef.current(collectedRef.current, updated);
    } else {
      gestureIdxRef.current = nextIdx;
      setGestureIdx(nextIdx);
      setSamplesCollected(0);
    }
  }, [cancelRecording, existingGestures]);

  // Hand status message
  let statusMsg;
  let statusOk;
  if (needsTwoHands) {
    if (bothHandsDetected) { statusMsg = '\u2713 Both hands detected'; statusOk = true; }
    else if (handDetected) { statusMsg = '\u26A0 Show both hands'; statusOk = false; }
    else { statusMsg = '\u2717 No hand detected'; statusOk = false; }
  } else {
    statusMsg = handDetected ? '\u2713 Hand detected' : '\u2717 No hand detected';
    statusOk = handDetected;
  }

  // Instruction text based on gesture type
  const instructionHint = needsTwoHands
    ? 'Place both hands in frame then press Start Recording'
    : 'Place your hand in frame then press Start Recording';

  // Steadiness bar colour
  const steadinessColor = steadiness > 0.5 ? 'var(--teal)' : '#d4a017';

  if (cameraError) {
    return (
      <div className="training radial-bg">
        <div className="training-error">
          <p>{cameraError}</p>
          <button className="btn" onClick={onBack}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`training radial-bg ${flash ? 'training-flash' : ''}`}>
      <div className="training-content">
        {/* Step indicator */}
        <div className="training-step">
          SIGN {gestureIdx + 1} OF {signs.length}
        </div>

        <SignLabel sign={gesture} />

        <div className="training-split">
          {/* Instruction card with animated illustration */}
          <div className="training-instruction">
            <GestureAnimation gestureId={gesture.id} />
            <p className="training-instruction-text">{gesture.instruction}</p>
          </div>

          {/* Webcam panel */}
          <div className="training-webcam-panel">
            <div className="training-webcam-wrapper">
              <video
                ref={videoRef}
                className="training-video"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="training-canvas" />
            </div>
            <div className={`training-status ${statusOk ? 'detected' : ''}`}>
              {statusMsg}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="training-progress-track">
          <div
            className="training-progress-fill"
            style={{ width: `${(samplesCollected / SAMPLES_REQUIRED) * 100}%` }}
          />
        </div>
        <p className="training-progress-label">
          {samplesCollected} / {SAMPLES_REQUIRED} samples
        </p>

        {/* Steadiness indicator (visible during recording) */}
        {recording && (
          <div className="training-steadiness">
            <span className="training-steadiness-label">Steadiness</span>
            <div className="training-steadiness-track">
              <div
                className="training-steadiness-fill"
                style={{ width: `${steadiness * 100}%`, background: steadinessColor }}
              />
            </div>
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div className={`training-feedback ${
            feedback.type === 'success' ? 'training-feedback-ok'
            : feedback.type === 'warn' ? 'training-feedback-warn'
            : 'training-feedback-err'
          }`}>
            {feedback.type === 'success' || feedback.type === 'warn' ? '\u2713 ' : ''}{feedback.msg}
          </div>
        )}

        {/* Instruction hint */}
        <p className="training-hint">{instructionHint}</p>

        {/* Actions */}
        <div className="training-actions">
          <button
            className={`btn btn-primary ${recording ? 'btn-recording' : ''}`}
            onClick={recording ? cancelRecording : startRecording}
            disabled={recording ? false : (!handDetected || (needsTwoHands && !bothHandsDetected))}
          >
            {recording ? 'Cancel' : 'Start Recording'}
          </button>

          <button className="btn btn-skip" onClick={handleSkip} disabled={recording}>
            {existingGestures.includes(gesture.id) ? 'Keep Existing' : 'Skip This Gesture'}
          </button>

          <button className="btn btn-small" onClick={onBack} disabled={recording}>
            Back
          </button>
        </div>

        <p className="training-skip-note">
          {existingGestures.includes(gesture.id)
            ? 'This gesture has saved data \u2014 skip to keep it, or retrain to replace'
            : 'Skipped gestures will not be recognised in game'}
        </p>
      </div>
    </div>
  );
}
