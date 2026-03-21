import { useState, useRef, useCallback, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import TrainingScreen from './components/TrainingScreen';
import GameScreen from './components/GameScreen';
import ScoreScreen from './components/ScoreScreen';
import {
  loadGestures,
  saveGestures,
  deleteGesture,
  clearAllGestures,
  exportGestures,
  importGestures,
  getGestureSummary,
} from './utils/gestureStorage';
import './App.css';

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(5);
  const [trained, setTrained] = useState(false);
  const [gestureSummary, setGestureSummary] = useState([]);
  const [storageError, setStorageError] = useState(null);

  // Training data lives in a ref so it survives navigation without triggering re-renders
  const trainingDataRef = useRef([]);
  const skippedGesturesRef = useRef([]);

  // Load saved gestures on mount
  useEffect(() => {
    try {
      const saved = loadGestures();
      if (saved && saved.samples.length > 0) {
        trainingDataRef.current = saved.samples;
        skippedGesturesRef.current = saved.skippedGestures;
        setTrained(true);
        setGestureSummary(getGestureSummary());
      }
    } catch {
      setStorageError('Saved gesture data appears corrupted. You can clear it and retrain.');
    }
  }, []);

  const refreshSummary = useCallback(() => {
    setGestureSummary(getGestureSummary());
  }, []);

  const goWelcome = useCallback(() => setScreen('welcome'), []);
  const goTraining = useCallback(() => setScreen('training'), []);
  const goGame = useCallback(() => setScreen('game'), []);

  const handleTrainingComplete = useCallback((data, skipped) => {
    // Merge new training data with existing data for gestures that weren't retrained
    const newLabels = new Set(data.map((s) => s.label));
    const kept = trainingDataRef.current.filter((s) => !newLabels.has(s.label));
    const merged = [...kept, ...data];

    trainingDataRef.current = merged;
    skippedGesturesRef.current = skipped || [];
    setTrained(true);

    try {
      saveGestures(merged, skipped || []);
      setStorageError(null);
    } catch (e) {
      setStorageError(e.message);
    }

    refreshSummary();
    setScreen('welcome');
  }, [refreshSummary]);

  const handleDeleteGesture = useCallback((gestureId) => {
    try {
      const result = deleteGesture(gestureId);
      if (result) {
        trainingDataRef.current = result.samples;
        skippedGesturesRef.current = result.skippedGestures;
        setTrained(result.samples.length > 0);
      } else {
        trainingDataRef.current = [];
        skippedGesturesRef.current = [];
        setTrained(false);
      }
      setStorageError(null);
    } catch (e) {
      setStorageError(e.message);
    }
    refreshSummary();
  }, [refreshSummary]);

  const handleClearAll = useCallback(() => {
    clearAllGestures();
    trainingDataRef.current = [];
    skippedGesturesRef.current = [];
    setTrained(false);
    setStorageError(null);
    refreshSummary();
  }, [refreshSummary]);

  const handleExport = useCallback(() => {
    const data = exportGestures();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sign-battle-gestures-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const result = importGestures(parsed);
        trainingDataRef.current = result.samples;
        skippedGesturesRef.current = result.skippedGestures;
        setTrained(result.samples.length > 0);
        setStorageError(null);
        refreshSummary();
      } catch (e) {
        setStorageError(e.message);
      }
    };
    reader.onerror = () => setStorageError('Failed to read file.');
    reader.readAsText(file);
  }, [refreshSummary]);

  const handleGameComplete = useCallback((correct, rounds) => {
    setScore(correct);
    setTotal(rounds);
    setScreen('score');
  }, []);

  return (
    <div className="app">
      <div className="celtic-bg" />

      {screen === 'welcome' && (
        <WelcomeScreen
          trained={trained}
          gestureSummary={gestureSummary}
          storageError={storageError}
          onTrain={goTraining}
          onPlay={goGame}
          onDeleteGesture={handleDeleteGesture}
          onClearAll={handleClearAll}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}

      {screen === 'training' && (
        <TrainingScreen
          trainingDataRef={trainingDataRef}
          existingGestures={gestureSummary.map((g) => g.id)}
          onComplete={handleTrainingComplete}
          onBack={goWelcome}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          trainingData={trainingDataRef.current}
          skippedGestures={skippedGesturesRef.current}
          onComplete={handleGameComplete}
          onExit={goWelcome}
        />
      )}

      {screen === 'score' && (
        <ScoreScreen
          score={score}
          total={total}
          onPlayAgain={goGame}
          onHome={goWelcome}
        />
      )}
    </div>
  );
}
