import { useState, useRef, useEffect, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { extractFeatures } from '../utils/featureExtraction';
import { euclidean, knnPredict } from '../utils/knnClassifier';
import { FINGERSPELL_SIGNS } from '../data/fingerspellSigns';
import ISLAlphabetReference from './ISLAlphabetReference';
import './TrainingScreen.css';

const SAMPLES_REQUIRED = 20;
const SAMPLE_INTERVAL_MS = 80;
const CONSISTENCY_THRESHOLD = 1.8;

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function computeMean(samples) {
  const len = samples[0].length;
  const mean = new Float32Array(len);
  for (const s of samples) for (let i = 0; i < len; i++) mean[i] += s[i];
  for (let i = 0; i < len; i++) mean[i] /= samples.length;
  return mean;
}

function consistencyScore(samples) {
  const mean = computeMean(samples);
  let total = 0;
  for (const s of samples) total += euclidean(s, mean);
  return total / samples.length;
}

function pickRandom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function separationCheck(newBatch, existingData) {
  if (existingData.length < 30) return true;
  const probes = pickRandom(newBatch, 5);
  let misclassified = 0;
  for (const probe of probes) {
    const prediction = knnPredict(probe.features, existingData, 7);
    if (prediction.label && prediction.label !== probe.label) misclassified++;
  }
  return misclassified <= 3;
}

export default function FingerspellTraining({ onComplete, onBack }) {
  const [gestureIdx, setGestureIdx] = useState(0);
  const [samplesCollected, setSamplesCollected] = useState(0);
  const [recording, setRecording] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [flash, setFlash] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [skippedGestures, setSkippedGestures] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [steadiness, setSteadiness] = useState(1);

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
  const batchRef = useRef([]);
  const runningMeanRef = useRef(null);
  const sepFailCountRef = useRef(0);
  const mountedRef = useRef(false);

  const gesture = FINGERSPELL_SIGNS[gestureIdx] || null;

  useEffect(() => { gestureIdxRef.current = gestureIdx; }, [gestureIdx]);
  useEffect(() => { skippedGesturesRef.current = skippedGestures; }, [skippedGestures]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

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

  const onResultsRef = useRef(null);
  useEffect(() => {
    onResultsRef.current = (results) => {
      const hasHands = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
      if (hasHands) {
        setHandDetected(true);
        landmarksRef.current = results.multiHandLandmarks;
        drawLandmarks(results.multiHandLandmarks, 320, 240);
      } else {
        setHandDetected(false);
        landmarksRef.current = null;
        const canvas = canvasRef.current;
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [drawLandmarks]);

  // MediaPipe Hands + Camera init
  useEffect(() => {
    mountedRef.current = true;
    const video = videoRef.current;
    if (!video) return;

    try {
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      hands.onResults((r) => { if (onResultsRef.current) onResultsRef.current(r); });
      handsRef.current = hands;

      const camera = new Camera(video, {
        onFrame: async () => {
          if (!mountedRef.current) return;
          try { if (handsRef.current) await handsRef.current.send({ image: video }); } catch {}
        },
        width: 320,
        height: 240,
      });
      camera.start().catch(() => {
        setCameraError('Camera access denied. Please allow camera permissions and reload.');
      });
      cameraRef.current = camera;
    } catch (err) {
      console.error('MediaPipe Hands init failed:', err);
      setCameraError('Unable to start hand tracking. Please reload and try again.');
    }

    return () => {
      mountedRef.current = false;
      if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
      if (video && video.srcObject) video.srcObject.getTracks().forEach((t) => t.stop());
      if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
    };
  }, []);

  // Validation after recording completes
  const validateAndAdvance = useCallback(() => {
    const batch = batchRef.current;
    const featureArrays = batch.map((s) => s.features);

    const avgDist = consistencyScore(featureArrays);
    if (avgDist > CONSISTENCY_THRESHOLD) {
      const label = batch[0].label;
      collectedRef.current = collectedRef.current.filter((s) => s.label !== label || !batch.includes(s));
      batchRef.current = [];
      runningMeanRef.current = null;
      setSamplesCollected(0);
      setSteadiness(1);
      setFeedback({ type: 'error', msg: 'Too much movement — hold the hand shape still and try again' });
      return;
    }

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
        : ' — next attempt will be accepted automatically';
      setFeedback({ type: 'error', msg: `Letter too similar to a previous one — make it more distinct${suffix}` });
      return;
    }

    const overrideUsed = bypassSeparation && existingData.length >= 5;
    sepFailCountRef.current = 0;
    batchRef.current = [];
    runningMeanRef.current = null;
    setSteadiness(1);
    setFeedback({
      type: overrideUsed ? 'warn' : 'success',
      msg: overrideUsed ? 'Accepted with override — letter saved' : 'Letter captured!',
    });
    setFlash(true);
    setTimeout(() => setFlash(false), 600);

    const nextIdx = gestureIdxRef.current + 1;
    if (nextIdx >= FINGERSPELL_SIGNS.length) {
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

      const features = extractFeatures(landmarksRef.current, false);

      if (runningMeanRef.current) {
        const dist = euclidean(features, runningMeanRef.current);
        const s = Math.max(0, Math.min(1, 1 - dist / CONSISTENCY_THRESHOLD));
        setSteadiness(s);
        const mean = runningMeanRef.current;
        const n = localCount;
        for (let i = 0; i < features.length; i++) mean[i] = (mean[i] * n + features[i]) / (n + 1);
      } else {
        runningMeanRef.current = new Float32Array(features);
        setSteadiness(1);
      }

      const currentGesture = FINGERSPELL_SIGNS[gestureIdxRef.current];
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
    for (const s of batchRef.current) {
      const idx = collectedRef.current.indexOf(s);
      if (idx !== -1) collectedRef.current.splice(idx, 1);
    }
    batchRef.current = [];
    runningMeanRef.current = null;
    setSamplesCollected(0);
    setSteadiness(1);
  }, []);

  const handleSkip = useCallback(() => {
    cancelRecording();
    sepFailCountRef.current = 0;
    const currentId = FINGERSPELL_SIGNS[gestureIdxRef.current].id;
    const updated = [...skippedGesturesRef.current, currentId];
    skippedGesturesRef.current = updated;
    setSkippedGestures(updated);
    setFeedback(null);

    const nextIdx = gestureIdxRef.current + 1;
    if (nextIdx >= FINGERSPELL_SIGNS.length) {
      onCompleteRef.current(collectedRef.current, updated);
    } else {
      gestureIdxRef.current = nextIdx;
      setGestureIdx(nextIdx);
      setSamplesCollected(0);
    }
  }, [cancelRecording]);

  const statusMsg = handDetected ? '✓ Hand detected' : '✗ No hand detected';
  const statusOk = handDetected;
  const steadinessColor = steadiness > 0.5 ? 'var(--teal)' : '#d4a017';

  if (!FINGERSPELL_SIGNS || FINGERSPELL_SIGNS.length === 0 || !gesture) {
    return (
      <div className="training radial-bg">
        <div className="training-error">
          <p>No fingerspelling letters are available right now.</p>
          <button className="btn" onClick={onBack}>Back</button>
        </div>
      </div>
    );
  }

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
        <div className="training-step">
          LETTER {gestureIdx + 1} OF {FINGERSPELL_SIGNS.length}
        </div>

        {/* Large letter display */}
        <div className="training-gesture-name">{gesture.en}</div>

        <div className="training-split">
          <div className="training-instruction">
            <div style={{ fontSize: '3rem', lineHeight: 1 }}>{gesture.icon}</div>
            <p className="training-instruction-text">{gesture.instruction}</p>
          </div>

          <div className="training-webcam-panel">
            <div className="training-webcam-wrapper">
              <video ref={videoRef} className="training-video" autoPlay playsInline muted />
              <canvas ref={canvasRef} className="training-canvas" />
            </div>
            <div className={`training-status ${statusOk ? 'detected' : ''}`}>
              {statusMsg}
            </div>
          </div>
        </div>

        <div className="training-progress-track">
          <div
            className="training-progress-fill"
            style={{ width: `${(samplesCollected / SAMPLES_REQUIRED) * 100}%` }}
          />
        </div>
        <p className="training-progress-label">
          {samplesCollected} / {SAMPLES_REQUIRED} samples
        </p>

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

        {feedback && (
          <div className={`training-feedback ${
            feedback.type === 'success' ? 'training-feedback-ok'
            : feedback.type === 'warn' ? 'training-feedback-warn'
            : 'training-feedback-err'
          }`}>
            {feedback.type === 'success' || feedback.type === 'warn' ? '✓ ' : ''}{feedback.msg}
          </div>
        )}

        <p className="training-hint">
          Place your hand in frame then press Start Recording
        </p>

        <div className="training-actions">
          <button
            className={`btn btn-primary ${recording ? 'btn-recording' : ''}`}
            onClick={recording ? cancelRecording : startRecording}
            disabled={recording ? false : !handDetected}
          >
            {recording ? 'Cancel' : 'Start Recording'}
          </button>

          <button className="btn btn-skip" onClick={handleSkip} disabled={recording}>
            Skip This Letter
          </button>

          <button className="btn btn-small" onClick={onBack} disabled={recording}>
            Back
          </button>
        </div>

        <p className="training-skip-note">
          Skipped letters will not be recognised during fingerspelling
        </p>
      </div>

      <ISLAlphabetReference />
    </div>
  );
}
