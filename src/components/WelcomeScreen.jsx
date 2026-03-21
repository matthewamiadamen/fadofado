import { GESTURES } from '../gestures';
import GestureManager from './GestureManager';
import './WelcomeScreen.css';

export default function WelcomeScreen({
  trained,
  gestureSummary,
  storageError,
  onTrain,
  onPlay,
  onDeleteGesture,
  onClearAll,
  onExport,
  onImport,
}) {
  return (
    <div className="welcome radial-bg">
      <div className="welcome-content">
        <h1 className="welcome-title">SIGN BATTLE</h1>
        <p className="welcome-subtitle">Cath Comharthaíochta</p>

        <div className="welcome-divider" />

        <div className="gesture-cards">
          {GESTURES.map((g) => (
            <div className="gesture-card" key={g.id}>
              <span className="gesture-card-icon">{g.icon}</span>
              <span className="gesture-card-en">{g.en}</span>
              <span className="gesture-card-ga">{g.ga}</span>
            </div>
          ))}
        </div>

        <div className="welcome-actions">
          <button className="btn btn-primary" onClick={onTrain}>
            {trained ? 'Retrain Gestures' : 'Train Gestures'}
          </button>

          {trained && (
            <button className="btn" onClick={onPlay} style={{ animationDelay: '0.1s' }}>
              Play Game
            </button>
          )}
        </div>

        {trained && (
          <div className="trained-badge">
            Gestures trained &mdash; ready to battle
          </div>
        )}

        {storageError && (
          <div className="welcome-error">
            {storageError}
            <button className="btn btn-small" onClick={onClearAll} style={{ marginTop: 8 }}>
              Clear &amp; Retrain
            </button>
          </div>
        )}

        <GestureManager
          gestureSummary={gestureSummary}
          onDeleteGesture={onDeleteGesture}
          onClearAll={onClearAll}
          onExport={onExport}
          onImport={onImport}
        />
      </div>
    </div>
  );
}
