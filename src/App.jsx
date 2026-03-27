import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useToast } from './components/Toast';
import LoadingScreen from './components/LoadingScreen';
import { getModuleTrainableSigns, GESTURES, getAllSigns } from './data/signs';
import {
  loadGestures,
  saveGestures,
  deleteGesture,
  clearAllGestures,
  exportGestures,
  importGestures,
  getGestureSummary,
} from './utils/gestureStorage';
import {
  loadFingerspellData,
  saveFingerspellData,
  getTrainedLetters,
} from './utils/fingerspellStorage';
import { hasDefaultModel, loadDefaultModel, defaultModelToSamples } from './utils/defaultModel';
import { recordSignResult, recordActivity } from './services/srs';
import { addScore, getPlayerName } from './services/leaderboard';
import './App.css';

// ── Lazy-loaded route components ───────────────────────────
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen'));
const TrainingScreen = lazy(() => import('./components/TrainingScreen'));
const GameScreen = lazy(() => import('./components/GameScreen'));
const ScoreScreen = lazy(() => import('./components/ScoreScreen'));
const AboutISL = lazy(() => import('./components/AboutISL'));
const ModuleSelect = lazy(() => import('./components/ModuleSelect'));
const ModuleDetail = lazy(() => import('./components/ModuleDetail'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));
const MySignsScreen = lazy(() => import('./components/MySignsScreen'));
const FingerspellScreen = lazy(() => import('./components/FingerspellScreen'));
const FingerspellGame = lazy(() => import('./components/FingerspellGame'));
const FingerspellComm = lazy(() => import('./components/FingerspellComm'));
const FingerspellTraining = lazy(() => import('./components/FingerspellTraining'));
const QuizMode = lazy(() => import('./components/QuizMode'));
const ReviewScreen = lazy(() => import('./components/ReviewScreen'));
const ProgressDashboard = lazy(() => import('./components/ProgressDashboard'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));

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

// ── Wrapper for module-scoped routes ────────────────────────
function ModuleDetailRoute({ trained, onStartTraining, onStartGame, onBack }) {
  const { moduleId } = useParams();
  return (
    <ModuleDetail
      moduleId={moduleId}
      trained={trained}
      onStartTraining={onStartTraining}
      onStartGame={onStartGame}
      onBack={onBack}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(5);
  const [trained, setTrained] = useState(false);
  const [gestureSummary, setGestureSummary] = useState([]);
  const [storageError, setStorageError] = useState(null);
  const toast = useToast();
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [moduleProgress, setModuleProgress] = useState(loadModuleProgress);
  const [defaultModelAvailable, setDefaultModelAvailable] = useState(false);

  // Training data lives in a ref so it survives navigation without triggering re-renders
  const trainingDataRef = useRef([]);
  const skippedGesturesRef = useRef([]);

  // Which signs are being trained (module-scoped or all)
  const trainSignsRef = useRef(null);
  const gameSignsRef = useRef(null);

  // ── Fingerspell state ───────────────────────────────────
  const [fsLettersTrained, setFsLettersTrained] = useState(0);
  const fsTrainingDataRef = useRef([]);

  // Load saved gestures on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await loadGestures();
        if (saved && saved.samples.length > 0) {
          trainingDataRef.current = saved.samples;
          skippedGesturesRef.current = saved.skippedGestures;
          setTrained(true);
          setGestureSummary(await getGestureSummary());
        }
      } catch {
        setStorageError('Saved gesture data appears corrupted. You can clear it and retrain.');
      }

      try {
        const fsSaved = await loadFingerspellData();
        if (fsSaved && fsSaved.samples.length > 0) {
          fsTrainingDataRef.current = fsSaved.samples;
          const letters = await getTrainedLetters();
          setFsLettersTrained(letters.length);
        }
      } catch { /* ignore */ }

      hasDefaultModel().then((has) => setDefaultModelAvailable(has)).catch(() => {});
    })();
  }, []);

  const refreshSummary = useCallback(async () => {
    setGestureSummary(await getGestureSummary());
  }, []);

  // ── Navigation ──────────────────────────────────────────
  const goWelcome = useCallback(() => { setActiveModuleId(null); navigate('/'); }, [navigate]);
  const goAbout = useCallback(() => navigate('/about'), [navigate]);
  const goModules = useCallback(() => navigate('/modules'), [navigate]);
  const goSettings = useCallback(() => navigate('/settings'), [navigate]);
  const goMySigns = useCallback(() => navigate('/my-signs'), [navigate]);
  const goFingerspell = useCallback(() => navigate('/fingerspell'), [navigate]);
  const goFingerspellGame = useCallback(() => navigate('/fingerspell/game'), [navigate]);
  const goFingerspellComm = useCallback(() => navigate('/fingerspell/communicate'), [navigate]);
  const goFingerspellTraining = useCallback(() => navigate('/fingerspell/train'), [navigate]);
  const goReview = useCallback(() => navigate('/review'), [navigate]);
  const goProgress = useCallback(() => navigate('/progress'), [navigate]);
  const goLeaderboard = useCallback(() => navigate('/leaderboard'), [navigate]);

  // Track last game mode for score screen context
  const lastGameModeRef = useRef('game');

  const handleQuickStart = useCallback(async () => {
    try {
      const data = await loadDefaultModel();
      if (!data) {
        toast('Default model not available', 'error');
        return;
      }
      const { samples, skippedGestures } = defaultModelToSamples(data);
      trainingDataRef.current = samples;
      skippedGesturesRef.current = skippedGestures;
      setTrained(true);
      await saveGestures(samples, skippedGestures);
      await refreshSummary();
      toast('Default model loaded — you can start playing!', 'success');
    } catch {
      toast('Failed to load default model', 'error');
    }
  }, [toast, refreshSummary]);

  const goTraining = useCallback(() => {
    trainSignsRef.current = null;
    setActiveModuleId(null);
    navigate('/train');
  }, [navigate]);

  const goGame = useCallback(() => {
    gameSignsRef.current = null;
    setActiveModuleId(null);
    navigate('/game');
  }, [navigate]);

  const goQuiz = useCallback(() => {
    navigate('/quiz');
  }, [navigate]);

  const goModuleTraining = useCallback((moduleId) => {
    const signs = getModuleTrainableSigns(moduleId);
    trainSignsRef.current = signs;
    setActiveModuleId(moduleId);
    navigate('/train');
  }, [navigate]);

  const goModuleGame = useCallback((moduleId) => {
    const signs = getModuleTrainableSigns(moduleId);
    gameSignsRef.current = signs;
    setActiveModuleId(moduleId);
    navigate('/game');
  }, [navigate]);

  const goModuleDetail = useCallback((moduleId) => {
    setActiveModuleId(moduleId);
    navigate(`/modules/${moduleId}`);
  }, [navigate]);

  // ── Training complete ───────────────────────────────────
  const handleTrainingComplete = useCallback(async (data, skipped) => {
    const newLabels = new Set(data.map((s) => s.label));
    const kept = trainingDataRef.current.filter((s) => !newLabels.has(s.label));
    const merged = [...kept, ...data];

    trainingDataRef.current = merged;
    skippedGesturesRef.current = skipped || [];
    setTrained(true);

    try {
      await saveGestures(merged, skipped || []);
      setStorageError(null);
      toast('Training data saved', 'success');
    } catch (e) {
      setStorageError(e.message);
      toast(e.message, 'error');
    }

    await refreshSummary();

    if (activeModuleId) {
      navigate(`/modules/${activeModuleId}`);
    } else {
      navigate('/');
    }
  }, [refreshSummary, activeModuleId, toast, navigate]);

  // ── Fingerspell training complete ───────────────────────
  const handleFsTrainingComplete = useCallback(async (data, skipped) => {
    fsTrainingDataRef.current = data;
    try {
      await saveFingerspellData(data, skipped || []);
    } catch { /* ignore */ }
    const letters = await getTrainedLetters();
    setFsLettersTrained(letters.length);
    navigate('/fingerspell');
  }, [navigate]);

  // ── Game complete ───────────────────────────────────────
  const handleGameComplete = useCallback((correct, rounds, signResults) => {
    setScore(correct);
    setTotal(rounds);
    lastGameModeRef.current = 'game';

    // Record SRS results for each sign played
    if (signResults && Array.isArray(signResults)) {
      for (const { signId, correct: wasCorrect } of signResults) {
        recordSignResult(signId, wasCorrect);
      }
    }
    recordActivity();

    // Add to leaderboard
    addScore({ name: getPlayerName() || 'Anonymous', score: correct, total: rounds, mode: 'game' });

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

    navigate('/score');
  }, [activeModuleId, navigate]);

  // ── Gesture management ──────────────────────────────────
  const handleDeleteGesture = useCallback(async (gestureId) => {
    try {
      const result = await deleteGesture(gestureId);
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
      toast(e.message, 'error');
    }
    await refreshSummary();
  }, [refreshSummary, toast]);

  const handleClearAll = useCallback(async () => {
    await clearAllGestures();
    trainingDataRef.current = [];
    skippedGesturesRef.current = [];
    setTrained(false);
    setStorageError(null);
    await refreshSummary();
    toast('All gesture data cleared', 'info');
  }, [refreshSummary, toast]);

  const handleExport = useCallback(async () => {
    const data = await exportGestures();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lamha-gestures-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const result = await importGestures(parsed);
        trainingDataRef.current = result.samples;
        skippedGesturesRef.current = result.skippedGestures;
        setTrained(result.samples.length > 0);
        setStorageError(null);
        await refreshSummary();
        toast('Gesture data imported successfully', 'success');
      } catch (e) {
        setStorageError(e.message);
        toast(e.message, 'error');
      }
    };
    reader.onerror = () => {
      setStorageError('Failed to read file.');
      toast('Failed to read file', 'error');
    };
    reader.readAsText(file);
  }, [refreshSummary, toast]);

  const trainingSigns = trainSignsRef.current || GESTURES;
  const gameSigns = gameSignsRef.current || GESTURES;

  return (
    <div className="app">
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <div className="celtic-bg" aria-hidden="true" />

      {/* Screen reader live regions */}
      <div id="sr-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
      <div id="sr-announcer-assertive" className="sr-only" aria-live="assertive" aria-atomic="true" />

      <main id="main-content" tabIndex={-1}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={
              <WelcomeScreen
                trained={trained}
                gestureSummary={gestureSummary}
                storageError={storageError}
                defaultModelAvailable={defaultModelAvailable && !trained}
                onQuickStart={handleQuickStart}
                onTrain={goTraining}
                onPlay={goGame}
                onClearAll={handleClearAll}
                onAbout={goAbout}
                onModules={goModules}
                onSettings={goSettings}
                onMySigns={goMySigns}
                onFingerspell={goFingerspell}
                onQuiz={goQuiz}
                onReview={goReview}
                onProgress={goProgress}
                onLeaderboard={goLeaderboard}
              />
            } />

            <Route path="/about" element={<AboutISL onBack={goWelcome} />} />
            <Route path="/settings" element={<SettingsPanel onBack={goWelcome} />} />

            <Route path="/my-signs" element={
              <MySignsScreen
                gestureSummary={gestureSummary}
                onDeleteGesture={handleDeleteGesture}
                onClearAll={handleClearAll}
                onExport={handleExport}
                onImport={handleImport}
                onBack={goWelcome}
              />
            } />

            <Route path="/modules" element={
              <ModuleSelect
                moduleProgress={moduleProgress}
                onSelectModule={goModuleDetail}
                onBack={goWelcome}
              />
            } />

            <Route path="/modules/:moduleId" element={
              <ModuleDetailRoute
                trained={trained}
                onStartTraining={goModuleTraining}
                onStartGame={goModuleGame}
                onBack={goModules}
              />
            } />

            <Route path="/train" element={
              <TrainingScreen
                trainingDataRef={trainingDataRef}
                existingGestures={gestureSummary.map((g) => g.id)}
                signsList={trainingSigns}
                onComplete={handleTrainingComplete}
                onBack={activeModuleId ? () => navigate(`/modules/${activeModuleId}`) : goWelcome}
              />
            } />

            <Route path="/game" element={
              <GameScreen
                trainingData={trainingDataRef.current}
                skippedGestures={skippedGesturesRef.current}
                signsList={gameSigns}
                onComplete={handleGameComplete}
                onExit={activeModuleId ? () => navigate(`/modules/${activeModuleId}`) : goWelcome}
              />
            } />

            <Route path="/score" element={
              <ScoreScreen
                score={score}
                total={total}
                gameMode={lastGameModeRef.current}
                onPlayAgain={activeModuleId ? () => goModuleGame(activeModuleId) : goGame}
                onHome={goWelcome}
                onLeaderboard={goLeaderboard}
              />
            } />

            <Route path="/quiz" element={
              <QuizMode
                signs={getAllSigns()}
                onComplete={(correct, rounds) => {
                  setScore(correct);
                  setTotal(rounds);
                  lastGameModeRef.current = 'quiz';
                  recordActivity();
                  addScore({ name: getPlayerName() || 'Anonymous', score: correct, total: rounds, mode: 'quiz' });
                  navigate('/score');
                }}
                onBack={goWelcome}
              />
            } />

            <Route path="/fingerspell" element={
              <FingerspellScreen
                fsLettersTrained={fsLettersTrained}
                onGame={goFingerspellGame}
                onCommunicate={goFingerspellComm}
                onTrain={goFingerspellTraining}
                onBack={goWelcome}
              />
            } />

            <Route path="/fingerspell/train" element={
              <FingerspellTraining
                onComplete={handleFsTrainingComplete}
                onBack={goFingerspell}
              />
            } />

            <Route path="/fingerspell/game" element={
              <FingerspellGame
                trainingData={fsTrainingDataRef.current}
                onComplete={(correct, rounds) => {
                  setScore(correct);
                  setTotal(rounds);
                  lastGameModeRef.current = 'fingerspell';
                  recordActivity();
                  addScore({ name: getPlayerName() || 'Anonymous', score: correct, total: rounds, mode: 'fingerspell' });
                  navigate('/score');
                }}
                onExit={goFingerspell}
              />
            } />

            <Route path="/fingerspell/communicate" element={
              <FingerspellComm
                trainingData={fsTrainingDataRef.current}
                onExit={goFingerspell}
              />
            } />

            <Route path="/review" element={<ReviewScreen onBack={goWelcome} />} />
            <Route path="/progress" element={<ProgressDashboard onBack={goWelcome} />} />
            <Route path="/leaderboard" element={<Leaderboard onBack={goWelcome} />} />

            {/* Fallback — redirect unknown routes home */}
            <Route path="*" element={
              <WelcomeScreen
                trained={trained}
                gestureSummary={gestureSummary}
                storageError={storageError}
                defaultModelAvailable={defaultModelAvailable && !trained}
                onQuickStart={handleQuickStart}
                onTrain={goTraining}
                onPlay={goGame}
                onClearAll={handleClearAll}
                onAbout={goAbout}
                onModules={goModules}
                onSettings={goSettings}
                onMySigns={goMySigns}
                onFingerspell={goFingerspell}
                onQuiz={goQuiz}
                onReview={goReview}
                onProgress={goProgress}
                onLeaderboard={goLeaderboard}
              />
            } />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
