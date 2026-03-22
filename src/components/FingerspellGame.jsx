import { useState, useRef, useEffect, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { extractFeatures } from '../utils/featureExtraction';
import { knnPredict } from '../utils/knnClassifier';
import { SIGN_ID_TO_LETTER } from '../data/fingerspellSigns';
import { WORDS, stripFadas } from '../data/irishWords';
import ISLAlphabetReference from './ISLAlphabetReference';
import './FingerspellGame.css';

const TOTAL_ROUNDS = 5;
const HOLD_THRESHOLD_MS = 1200;
const CONFIDENCE_THRESHOLD_MP = 0.65;

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FingerspellGame({ trainingData, onComplete, onExit }) {
  // ── Shared state ───────────────────────────────────────
  const [round, setRound] = useState(0);
  const [words] = useState(() => shuffle(WORDS).slice(0, TOTAL_ROUNDS));
  const [typed, setTyped] = useState('');
  const [currentLetter, setCurrentLetter] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [handPresent, setHandPresent] = useState(false);
  const [flash, setFlash] = useState(null);
  const [score, setScore] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const bufRef = useRef([]);
  const readyNextRef = useRef(true);
  const lastRegisteredRef = useRef(null);
  const roundRef = useRef(0);
  const typedRef = useRef('');
  const scoreRef = useRef(0);
  const mountedRef = useRef(false);
  const holdStartRef = useRef(null);

  const trainingDataRef = useRef(trainingData);
  useEffect(() => { trainingDataRef.current = trainingData; }, [trainingData]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { typedRef.current = typed; }, [typed]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const word = words[round];
  const targetLetters = word ? stripFadas(word.irish).toUpperCase().split('') : [];
  const nextLetter = targetLetters[typed.length] || null;

  // ── Letter registration (shared) ─────────────────────

  const advanceRound = useCallback(() => {
    const next = roundRef.current + 1;
    if (next >= TOTAL_ROUNDS) {
      onComplete(scoreRef.current + 1, TOTAL_ROUNDS);
    } else {
      setRound(next);
      setTyped('');
      bufRef.current = [];
      readyNextRef.current = true;
      lastRegisteredRef.current = null;
      holdStartRef.current = null;
    }
  }, [onComplete]);

  const registerLetter = useCallback((letter) => {
    const target = stripFadas(words[roundRef.current].irish).toUpperCase().split('');
    const currentTyped = typedRef.current;
    const idx = currentTyped.length;
    if (idx >= target.length) return;

    if (letter === target[idx]) {
      const newTyped = currentTyped + letter;
      setTyped(newTyped);
      if (newTyped.length >= target.length) {
        setFlash('correct');
        setScore((s) => s + 1);
        setTimeout(() => { setFlash(null); advanceRound(); }, 1200);
      }
    }
  }, [words, advanceRound]);

  const handleSkip = useCallback(() => {
    setFlash('wrong');
    setTimeout(() => { setFlash(null); advanceRound(); }, 800);
  }, [advanceRound]);

  // ── MediaPipe mode: Hands + Camera ───────────────────

  const drawLandmarks = useCallback((allHands) => {
    const canvas = overlayCanvasRef.current;
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

  const onResultsRef = useRef(null);
  useEffect(() => {
    onResultsRef.current = (results) => {
      const canvas = overlayCanvasRef.current;
      if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setHandPresent(true);
        drawLandmarks(results.multiHandLandmarks);

        const features = extractFeatures(results.multiHandLandmarks, false);
        const td = trainingDataRef.current;
        if (!td || td.length === 0) return;

        const prediction = knnPredict(features, td, 5);
        const letter = SIGN_ID_TO_LETTER[prediction.label] || null;
        const conf = prediction.confidence;

        setCurrentLetter(letter);
        setConfidence(Math.round(conf * 100));

        if (letter && conf >= CONFIDENCE_THRESHOLD_MP) {
          if (!holdStartRef.current || holdStartRef.current.letter !== letter) {
            holdStartRef.current = { letter, time: Date.now() };
          } else if (Date.now() - holdStartRef.current.time >= HOLD_THRESHOLD_MS) {
            holdStartRef.current = null;
            registerLetter(letter);
          }
        } else {
          holdStartRef.current = null;
        }
      } else {
        setHandPresent(false);
        setCurrentLetter(null);
        setConfidence(0);
        holdStartRef.current = null;
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [drawLandmarks, registerLetter]);

  useEffect(() => {
    mountedRef.current = true;
    const video = videoRef.current;
    if (!video) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
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
      width: 640,
      height: 480,
    });
    camera.start().catch(() => {
      setCameraError('Camera access denied. Please allow camera permissions and reload.');
    });
    cameraRef.current = camera;

    return () => {
      mountedRef.current = false;
      if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
      if (video && video.srcObject) video.srcObject.getTracks().forEach((t) => t.stop());
      if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
    };
  }, []);

  // ── Confidence bar colour ────────────────────────────

  const barColor = confidence >= 65 ? 'var(--teal)' : confidence >= 40 ? 'var(--gold)' : 'var(--red)';

  if (cameraError) {
    return (
      <div className="fgame radial-bg">
        <div className="fgame-error">
          <p>{cameraError}</p>
          <button className="btn" onClick={onExit}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fgame">
      {/* Video feed */}
      <video ref={videoRef} className="fgame-video" autoPlay playsInline muted />
      <canvas ref={overlayCanvasRef} className="fgame-canvas" />

      <div className="fgame-vignette" />

      <div className="fgame-round">
        ROUND {round + 1} / {TOTAL_ROUNDS}
      </div>

      <button className="fgame-exit" onClick={onExit}>EXIT</button>

      {/* Prompt */}
      {word && (
        <div className="fgame-prompt">
          <span className="fgame-prompt-top">SPELL IN ISL</span>
          <span className="fgame-prompt-word">{word.emoji} {word.irish}</span>
          <span className="fgame-prompt-irish">{word.english}</span>
        </div>
      )}

      {/* Letter progress */}
      <div className="fgame-letters">
        {targetLetters.map((l, i) => (
          <span
            key={i}
            className={`fgame-letter ${
              i < typed.length ? 'fgame-letter-done' :
              i === typed.length ? 'fgame-letter-active' : ''
            }`}
          >
            {i < typed.length ? typed[i] : l}
          </span>
        ))}
      </div>

      {/* Current detection */}
      {handPresent && currentLetter && (
        <div className="fgame-detected">
          <span className="fgame-detected-letter">{currentLetter}</span>
          <span className="fgame-detected-conf">{confidence}%</span>
        </div>
      )}

      {/* Flash overlays */}
      {flash === 'correct' && (
        <div className="fgame-flash">
          <span className="fgame-flash-emoji">{word.emoji}</span>
          <span className="fgame-flash-word">{word.irish}</span>
          <span className="fgame-flash-sub">Go hiontach!</span>
        </div>
      )}
      {flash === 'wrong' && (
        <div className="fgame-flash fgame-flash-skip">
          <span className="fgame-flash-word">Skipped</span>
        </div>
      )}

      {/* Bottom bar */}
      <div className="fgame-bottom">
        <div className="fgame-bar-track">
          <div className="fgame-bar-fill" style={{ width: `${confidence}%`, background: barColor }} />
        </div>
        <div className="fgame-skip-row">
          <button className="fgame-skip-btn" onClick={handleSkip}>SKIP</button>
          <span className="fgame-score">Score: {score} / {TOTAL_ROUNDS}</span>
        </div>
      </div>

      <ISLAlphabetReference />
    </div>
  );
}
