import { useState, useRef, useEffect, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { extractFeatures } from '../utils/featureExtraction';
import { knnPredict } from '../utils/knnClassifier';
import { SIGN_ID_TO_LETTER } from '../data/fingerspellSigns';
import { translateSentence } from '../data/irishWords';
import ISLAlphabetReference from './ISLAlphabetReference';
import './FingerspellComm.css';

const SENTENCE_TIMEOUT_MS = 5000;
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

export default function FingerspellComm({ trainingData, onExit }) {
  const [currentLetter, setCurrentLetter] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [handPresent, setHandPresent] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [sentence, setSentence] = useState('');
  const [translation, setTranslation] = useState('');
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const bufRef = useRef([]);
  const readyNextRef = useRef(true);
  const lastRegisteredRef = useRef(null);
  const sentenceTimerRef = useRef(null);
  const currentWordRef = useRef('');
  const sentenceRef = useRef('');
  const mountedRef = useRef(false);
  const holdStartRef = useRef(null);

  const trainingDataRef = useRef(trainingData);
  useEffect(() => { trainingDataRef.current = trainingData; }, [trainingData]);
  useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);
  useEffect(() => { sentenceRef.current = sentence; }, [sentence]);

  // ── Letter & word registration ───────────────────────

  const finaliseWord = useCallback(() => {
    const w = currentWordRef.current.trim();
    if (!w) return;
    const newSentence = sentenceRef.current ? sentenceRef.current + ' ' + w : w;
    setSentence(newSentence);
    setTranslation(translateSentence(newSentence));
    setCurrentWord('');
  }, []);

  const registerLetter = useCallback((letter) => {
    setCurrentWord((prev) => prev + letter);
    if (sentenceTimerRef.current) clearTimeout(sentenceTimerRef.current);
    sentenceTimerRef.current = setTimeout(() => finaliseWord(), SENTENCE_TIMEOUT_MS);
  }, [finaliseWord]);

  const handleSpace = useCallback(() => {
    if (sentenceTimerRef.current) clearTimeout(sentenceTimerRef.current);
    finaliseWord();
  }, [finaliseWord]);

  const handleClear = useCallback(() => {
    if (sentenceTimerRef.current) clearTimeout(sentenceTimerRef.current);
    setCurrentWord('');
    setSentence('');
    setTranslation('');
  }, []);

  const handleBackspace = useCallback(() => {
    setCurrentWord((prev) => prev.slice(0, -1));
  }, []);

  const handleSpeak = useCallback(() => {
    const text = translation || sentence || currentWord;
    if (!text || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ga-IE';
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  }, [translation, sentence, currentWord]);

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
        readyNextRef.current = true;
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [drawLandmarks, registerLetter]);

  useEffect(() => {
    mountedRef.current = true;
    const video = videoRef.current;
    if (!video) return;

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

  const barColor = confidence >= 65 ? 'var(--teal)' : confidence >= 40 ? 'var(--gold)' : 'var(--red)';

  if (cameraError) {
    return (
      <div className="fcomm radial-bg">
        <div className="fcomm-error">
          <p>{cameraError}</p>
          <button className="btn" onClick={onExit}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fcomm">
      <video ref={videoRef} className="fcomm-video" autoPlay playsInline muted />
      <canvas ref={overlayCanvasRef} className="fcomm-canvas" />

      <div className="fcomm-vignette" />

      <div className="fcomm-header">
        <span className="fcomm-mode-label">CUMARSÁID</span>
      </div>

      <button className="fcomm-exit" onClick={onExit}>EXIT</button>

      {handPresent && currentLetter && (
        <div className="fcomm-detected">
          <span className="fcomm-detected-letter">{currentLetter}</span>
          <span className="fcomm-detected-conf">{confidence}%</span>
        </div>
      )}

      <div className="fcomm-output">
        {sentence && (
          <div className="fcomm-sentence">
            <span className="fcomm-sentence-label">SENTENCE</span>
            <span className="fcomm-sentence-text">{sentence}</span>
          </div>
        )}

        <div className="fcomm-word">
          <span className="fcomm-word-label">CURRENT WORD</span>
          <span className="fcomm-word-text">
            {currentWord || <span className="fcomm-placeholder">Sign a letter&hellip;</span>}
          </span>
        </div>

        {translation && (
          <div className="fcomm-translation">
            <span className="fcomm-translation-label">AS GAEILGE</span>
            <span className="fcomm-translation-text">{translation}</span>
          </div>
        )}

        <div className="fcomm-actions">
          <button className="fcomm-action-btn" onClick={handleSpace}>SPACE</button>
          <button className="fcomm-action-btn" onClick={handleBackspace}>DELETE</button>
          <button className="fcomm-action-btn" onClick={handleClear}>CLEAR</button>
          <button className="fcomm-action-btn fcomm-action-speak" onClick={handleSpeak}>SPEAK</button>
        </div>
      </div>

      <div className="fcomm-bottom">
        <div className="fcomm-bar-track">
          <div className="fcomm-bar-fill" style={{ width: `${confidence}%`, background: barColor }} />
        </div>
      </div>

      <ISLAlphabetReference />
    </div>
  );
}
