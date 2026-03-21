import { useState, useRef, useCallback, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import TrainingScreen from './components/TrainingScreen';
import GameScreen from './components/GameScreen';
import ScoreScreen from './components/ScoreScreen';
import AboutISL from './components/AboutISL';
import ModuleSelect from './components/ModuleSelect';
import ModuleDetail from './components/ModuleDetail';
import SettingsPanel from './components/SettingsPanel';
import MySignsScreen from './components/MySignsScreen';
import { getModuleTrainableSigns, GESTURES } from './data/signs';
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

// Module progress storage
const PROGRESS_KEY = 'isl-module-progress';

function loadModuleProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveModuleProgress(progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* ignore */ }
}

export default function App() {
  // Screens: welcome | training | game | score | about | modules | module-detail | settings
  const [screen, setScreen] = useState('welcome');
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(5);
  const [trained, setTrained] = useState(false);
  const [gestureSummary, setGestureSummary] = useState([]);
  const [storageError, setStorageError] = useState(null);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [moduleProgress, setModuleProgress] = useState(loadModuleProgress);

  // Training data lives in a ref so it survives navigation without triggering re-renders
  const trainingDataRef = useRef([]);
  const skippedGesturesRef = useRef([]);

  // Which signs are being trained (module-scoped or all)
  const trainSignsRef = useRef(null);
  const gameSignsRef = useRef(null);

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

  // ── Navigation ──────────────────────────────────────────
  const goWelcome = useCallback(() => { setActiveModuleId(null); setScreen('welcome'); }, []);
  const goAbout = useCallback(() => setScreen('about'), []);
  const goModules = useCallback(() => setScreen('modules'), []);
  const goSettings = useCallback(() => setScreen('settings'), []);
  const goMySigns = useCallback(() => setScreen('my-signs'), []);

  const goTraining = useCallback(() => {
    trainSignsRef.current = null;
    setActiveModuleId(null);
    setScreen('training');
  }, []);

  const goGame = useCallback(() => {
    gameSignsRef.current = null;
    setActiveModuleId(null);
    setScreen('game');
  }, []);

  const goModuleTraining = useCallback((moduleId) => {
    const signs = getModuleTrainableSigns(moduleId);
    trainSignsRef.current = signs;
    setActiveModuleId(moduleId);
    setScreen('training');
  }, []);

  const goModuleGame = useCallback((moduleId) => {
    const signs = getModuleTrainableSigns(moduleId);
    gameSignsRef.current = signs;
    setActiveModuleId(moduleId);
    setScreen('game');
  }, []);

  const goModuleDetail = useCallback((moduleId) => {
    setActiveModuleId(moduleId);
    setScreen('module-detail');
  }, []);

  // ── Training complete ───────────────────────────────────
  const handleTrainingComplete = useCallback((data, skipped) => {
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

    if (activeModuleId) {
      setScreen('module-detail');
    } else {
      setScreen('welcome');
    }
  }, [refreshSummary, activeModuleId]);

  // ── Game complete ───────────────────────────────────────
  const handleGameComplete = useCallback((correct, rounds) => {
    setScore(correct);
    setTotal(rounds);

    if (activeModuleId) {
      const accuracy = rounds > 0 ? correct / rounds : 0;
      setModuleProgress((prev) => {
        const next = { ...prev };
        if (!next[activeModuleId] || accuracy > next[activeModuleId]) {
          next[activeModuleId] = accuracy;
        }
        saveModuleProgress(next);
        return next;
      });
    }

    setScreen('score');
  }, [activeModuleId]);

  // ── Gesture management ──────────────────────────────────
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

  const trainingSigns = trainSignsRef.current || GESTURES;
  const gameSigns = gameSignsRef.current || GESTURES;

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
          onClearAll={handleClearAll}
          onAbout={goAbout}
          onModules={goModules}
          onSettings={goSettings}
          onMySigns={goMySigns}
        />
      )}

      {screen === 'about' && <AboutISL onBack={goWelcome} />}
      {screen === 'settings' && <SettingsPanel onBack={goWelcome} />}

      {screen === 'my-signs' && (
        <MySignsScreen
          gestureSummary={gestureSummary}
          onDeleteGesture={handleDeleteGesture}
          onClearAll={handleClearAll}
          onExport={handleExport}
          onImport={handleImport}
          onBack={goWelcome}
        />
      )}

      {screen === 'modules' && (
        <ModuleSelect
          moduleProgress={moduleProgress}
          onSelectModule={goModuleDetail}
          onBack={goWelcome}
        />
      )}

      {screen === 'module-detail' && activeModuleId && (
        <ModuleDetail
          moduleId={activeModuleId}
          trained={trained}
          onStartTraining={goModuleTraining}
          onStartGame={goModuleGame}
          onBack={goModules}
        />
      )}

      {screen === 'training' && (
        <TrainingScreen
          trainingDataRef={trainingDataRef}
          existingGestures={gestureSummary.map((g) => g.id)}
          signsList={trainingSigns}
          onComplete={handleTrainingComplete}
          onBack={activeModuleId ? () => setScreen('module-detail') : goWelcome}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          trainingData={trainingDataRef.current}
          skippedGestures={skippedGesturesRef.current}
          signsList={gameSigns}
          onComplete={handleGameComplete}
          onExit={activeModuleId ? () => setScreen('module-detail') : goWelcome}
        />
      )}

      {screen === 'score' && (
        <ScoreScreen
          score={score}
          total={total}
          onPlayAgain={activeModuleId ? () => goModuleGame(activeModuleId) : goGame}
          onHome={goWelcome}
        />
      )}
    </div>
  );
}
