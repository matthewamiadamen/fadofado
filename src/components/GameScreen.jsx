import { useState, useRef, useEffect, useCallback } from 'react';
import { extractFeatures, extractFeaturesTwoHands } from '../utils/featureExtraction';
import { knnPredict } from '../utils/knnClassifier';
import { GESTURES } from '../gestures';
import { useSettings } from '../contexts/SettingsContext';
import { SignLabel } from './SignCard';
import './GameScreen.css';

const TOTAL_ROUNDS = 5;
const HOLD_THRESHOLD_MS = 1200;
const CONFIDENCE_THRESHOLD = 0.65;
const ROUND_PAUSE_MS = 2000;
const MAX_SKIPS = 2;

// Build rounds from available (non-skipped) signs
function shuffleRounds(signsList, skippedGestures) {
  const available = signsList.filter((g) => !skippedGestures.includes(g.id));
  if (available.length === 0) return [];
  const pool = [];
  while (pool.length < TOTAL_ROUNDS) {
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    pool.push(...shuffled);
  }
  return pool.slice(0, TOTAL_ROUNDS);
}

// Hand connections for skeleton drawing
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

export default function GameScreen({ trainingData, skippedGestures, signsList, onComplete, onExit }) {
  const signs = signsList || GESTURES;
  const { settings } = useSettings();
  const mirrorX = settings.dominantHand === 'left';
  const [rounds] = useState(() => shuffleRounds(signs, skippedGestures || []));
  const [roundIdx, setRoundIdx] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [matched, setMatched] = useState(false);
  const [score, setScore] = useState(0);
  const [flashWord, setFlashWord] = useState(null); // { ga, en } or null
  const [skipsUsed, setSkipsUsed] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const holdStartRef = useRef(null);
  const scoreRef = useRef(0);
  const roundIdxRef = useRef(0);
  const roundsRef = useRef(rounds);
  const pausedRef = useRef(false);
  const completedRef = useRef(false);
  const mountedRef = useRef(false);

  const mirrorXRef = useRef(mirrorX);
  useEffect(() => { mirrorXRef.current = mirrorX; }, [mirrorX]);

  // Store trainingData in a ref so the onResults closure always reads the
  // current value, not a stale snapshot from the initial render.
  const trainingDataRef = useRef(trainingData);
  useEffect(() => {
    trainingDataRef.current = trainingData;
  }, [trainingData]);

  // Keep onComplete in a ref so advanceRound never goes stale
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const totalRounds = rounds.length;
  const currentGesture = rounds[roundIdx];

  // Draw all detected hand landmarks on the full-screen canvas
  const drawLandmarks = useCallback((allHands) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const landmarks of allHands) {
      ctx.strokeStyle = '#c9a84c';
      ctx.lineWidth = 1.5;
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
        ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
        ctx.stroke();
      }
      ctx.fillStyle = '#c9a84c';
      for (const lm of landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // Advance to next round or finish.
  // Reads exclusively from refs — never stale.
  const advanceRound = useCallback(() => {
    const nextIdx = roundIdxRef.current + 1;
    if (nextIdx >= totalRounds) {
      completedRef.current = true;
      onCompleteRef.current(scoreRef.current, totalRounds);
      return;
    }
    roundIdxRef.current = nextIdx;
    setRoundIdx(nextIdx);
    setConfidence(0);
    setMatched(false);
    holdStartRef.current = null;
    pausedRef.current = false;
  }, [totalRounds]);

  // Skip round (counts as incorrect)
  const handleSkip = useCallback(() => {
    setSkipsUsed((prev) => prev + 1);
    pausedRef.current = true;
    setConfidence(0);
    holdStartRef.current = null;
    setTimeout(() => advanceRound(), 300);
  }, [advanceRound]);

  // ── onResults callback stored in a ref ──────────────────────────────
  // The MediaPipe init effect passes a thin stable wrapper to hands.onResults
  // that delegates here. This ref is updated whenever deps change, so the
  // processing logic always sees fresh values without re-creating the camera.
  const onResultsRef = useRef(null);

  useEffect(() => {
    onResultsRef.current = (results) => {
      // Guard: skip processing when game is over or between rounds
      if (completedRef.current || pausedRef.current) return;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        drawLandmarks(results.multiHandLandmarks);

        const targetGesture = roundsRef.current[roundIdxRef.current];
        if (!targetGesture) return;

        // Extract features matching the gesture type
        let features;
        if (targetGesture.twoHanded) {
          features = extractFeaturesTwoHands(results.multiHandLandmarks, mirrorXRef.current);
          if (!features) {
            setConfidence(0);
            holdStartRef.current = null;
            return;
          }
        } else {
          features = extractFeatures(results.multiHandLandmarks, mirrorXRef.current);
        }

        // Check 5: read training data from ref, not stale closure prop
        const td = trainingDataRef.current;
        if (!td || td.length === 0) return;

        const prediction = knnPredict(features, td, 5);
        const conf = prediction.label === targetGesture.id ? prediction.confidence : 0;
        setConfidence(conf);

        if (conf >= CONFIDENCE_THRESHOLD) {
          if (!holdStartRef.current) {
            holdStartRef.current = Date.now();
          } else if (Date.now() - holdStartRef.current >= HOLD_THRESHOLD_MS) {
            scoreRef.current += 1;
            setScore(scoreRef.current);
            setMatched(true);
            pausedRef.current = true;
            setFlashWord({ ga: targetGesture.ga, en: targetGesture.en });

            setTimeout(() => {
              setFlashWord(null);
              advanceRound();
            }, ROUND_PAUSE_MS);
          }
        } else {
          holdStartRef.current = null;
        }
      } else {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setConfidence(0);
        holdStartRef.current = null;
      }
    };
  }, [drawLandmarks, advanceRound]);

  // ── MediaPipe + Camera init ─────────────────────────────────────────
  // Runs once ([] deps). Uses mountedRef to prevent the StrictMode
  // cleanup → remount cycle from leaving completedRef/pausedRef dirty.
  useEffect(() => {
    // Check 1-2: Reset flags that the previous cleanup may have dirtied
    // (React 18 StrictMode unmounts+remounts — useRef values persist)
    completedRef.current = false;
    pausedRef.current = false;
    mountedRef.current = true;

    // Check 3: bail if video element isn't in the DOM yet
    const video = videoRef.current;
    if (!video) return;

    try {
    const hands = new window.Hands({
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

    const camera = new window.Camera(video, {
      onFrame: async () => {
        // Only send frames while this effect instance is active
        if (!mountedRef.current) return;
        try {
          if (handsRef.current) {
            await handsRef.current.send({ image: video });
          }
        } catch {
          // Hands instance was closed during StrictMode teardown — ignore
        }
      },
      width: 640,
      height: 480,
    });
    camera.start().catch(console.error);
    cameraRef.current = camera;
    } catch (err) {
      console.error('MediaPipe Hands init failed:', err);
    }

    return () => {
      // Mark unmounted FIRST so the onFrame loop stops sending
      mountedRef.current = false;
      completedRef.current = true;
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach((t) => t.stop());
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
  }, []); // stable — runs once per mount cycle

  // ESC to exit
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit]);

  const barColor = matched ? 'var(--teal)' : 'var(--gold)';
  const canSkip = skipsUsed < MAX_SKIPS;

  // Edge case: no gestures trained (all skipped)
  if (totalRounds === 0) {
    return (
      <div className="game game-empty">
        <p>No gestures were trained. Go back and train at least one gesture.</p>
        <button className="btn" onClick={onExit}>Home</button>
      </div>
    );
  }

  return (
    <div className="game">
      {/* Full-viewport webcam background */}
      <video ref={videoRef} className="game-video" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="game-canvas" />

      {/* Vignette overlay */}
      <div className="game-vignette" />

      {/* Round counter top-left */}
      <div className="game-round">
        {roundIdx + 1} / {totalRounds}
      </div>

      {/* Exit button top-right */}
      <button className="game-exit" onClick={onExit}>
        ESC
      </button>

      {/* Prompt pill — Irish-first trilingual */}
      {currentGesture && (
        <div className="game-prompt">
          <span className="game-prompt-top">{(currentGesture.ga || currentGesture.en).toUpperCase()}</span>
          <span className="game-prompt-main">{currentGesture.ga || currentGesture.en}</span>
          {currentGesture.gaPhonetic && (
            <span className="game-prompt-phonetic">/{currentGesture.gaPhonetic}/</span>
          )}
          <span className="game-prompt-secondary">{currentGesture.ga ? currentGesture.en : ''}</span>
        </div>
      )}

      {/* Flash word on success */}
      {flashWord && (
        <div className="game-flash-pill">
          <span className="game-flash-ga">{flashWord.ga}</span>
          <span className="game-flash-en">{flashWord.en}</span>
        </div>
      )}

      {/* Bottom overlay: confidence bar + skip */}
      <div className="game-bottom">
        <div className="game-bar-track">
          <div
            className="game-bar-fill"
            style={{
              width: `${Math.min(confidence * 100, 100)}%`,
              background: barColor,
            }}
          />
        </div>

        <div className="game-skip-row">
          <button
            className={`game-skip-btn ${!canSkip ? 'game-skip-disabled' : ''}`}
            onClick={handleSkip}
            disabled={!canSkip}
          >
            Skip
          </button>
          <span className="game-skip-counter">
            Skips: {MAX_SKIPS - skipsUsed} remaining
          </span>
        </div>
      </div>
    </div>
  );
}
