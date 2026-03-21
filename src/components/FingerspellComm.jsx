import { useState, useRef, useEffect, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { extractFeatures } from '../utils/featureExtraction';
import { knnPredict } from '../utils/knnClassifier';
import { SIGN_ID_TO_LETTER } from '../data/fingerspellSigns';
import { translateSentence } from '../data/irishWords';
import { getSocket, disconnectSocket } from '../utils/socketService';
import ISLAlphabetReference from './ISLAlphabetReference';
import './FingerspellComm.css';

const FPS = 8;
const STABLE_FRAMES = 3;
const MIN_CONFIDENCE_CNN = 40;
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

export default function FingerspellComm({ mode, trainingData, onExit }) {
  const isCNN = mode === 'cnn';

  const [currentLetter, setCurrentLetter] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [handPresent, setHandPresent] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [sentence, setSentence] = useState('');
  const [translation, setTranslation] = useState('');
  const [cameraError, setCameraError] = useState(null);

  // CNN-only
  const [connected, setConnected] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const intervalRef = useRef(null);
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

  // ── CNN mode: Socket.IO ──────────────────────────────

  useEffect(() => {
    if (!isCNN) return;
    const socket = getSocket();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('status', (data) => setModelReady(data.model_loaded));
    socket.on('prediction', (data) => {
      setHandPresent(data.hand_present);
      if (!data.hand_present || !data.letter) {
        setCurrentLetter(null);
        setConfidence(0);
        bufRef.current = [];
        return;
      }
      setCurrentLetter(data.letter);
      setConfidence(data.confidence);

      if (data.confidence < MIN_CONFIDENCE_CNN) { bufRef.current = []; return; }

      const buf = bufRef.current;
      buf.push(data.letter);
      if (buf.length > STABLE_FRAMES) buf.shift();

      if (buf.length >= STABLE_FRAMES && buf.every((l) => l === buf[0])) {
        const letter = buf[0];
        if (!readyNextRef.current && letter === lastRegisteredRef.current) return;
        readyNextRef.current = false;
        lastRegisteredRef.current = letter;
        bufRef.current = [];
        registerLetter(letter);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('status');
      socket.off('prediction');
      disconnectSocket();
    };
  }, [isCNN, registerLetter]);

  useEffect(() => {
    if (isCNN && !handPresent) readyNextRef.current = true;
  }, [isCNN, handPresent]);

  // ── CNN mode: webcam + frame capture ─────────────────

  useEffect(() => {
    if (!isCNN) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setCameraError('Camera access denied. Please allow camera permissions and reload.');
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    };
  }, [isCNN]);

  useEffect(() => {
    if (!isCNN) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');

    intervalRef.current = setInterval(() => {
      if (video.readyState < 2) return;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const socket = getSocket();
      if (socket.connected) socket.emit('frame', { image: dataUrl });
    }, 1000 / FPS);

    return () => clearInterval(intervalRef.current);
  }, [isCNN]);

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
    if (isCNN) return;
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
  }, [isCNN, drawLandmarks, registerLetter]);

  useEffect(() => {
    if (isCNN) return;
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
  }, [isCNN]);

  const barColor = isCNN
    ? (confidence >= 70 ? 'var(--teal)' : confidence >= MIN_CONFIDENCE_CNN ? 'var(--gold)' : 'var(--red)')
    : (confidence >= 65 ? 'var(--teal)' : confidence >= 40 ? 'var(--gold)' : 'var(--red)');

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
      {isCNN && <canvas ref={canvasRef} style={{ display: 'none' }} />}
      {!isCNN && <canvas ref={overlayCanvasRef} className="fcomm-canvas" />}

      <div className="fcomm-vignette" />

      <div className="fcomm-header">
        <span className="fcomm-mode-label">CUMARSÁID</span>
      </div>

      <button className="fcomm-exit" onClick={onExit}>EXIT</button>

      {isCNN && !connected && (
        <div className="fcomm-status-banner">Connecting to Flask backend&hellip;</div>
      )}
      {isCNN && connected && !modelReady && (
        <div className="fcomm-status-banner">Model loading&hellip;</div>
      )}

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
