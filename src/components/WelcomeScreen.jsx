import { useState } from 'react';
import { GESTURES } from '../data/signs';
import { getRandomProverb } from '../data/seanfhocail';
import GestureManager from './GestureManager';
import SignCard from './SignCard';
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
  onAbout,
  onModules,
  onSettings,
}) {
  const [proverb] = useState(() => getRandomProverb());

  // Show a small subset of signs as preview cards
  const previewSigns = GESTURES.slice(0, 4);

  return (
    <div className="welcome radial-bg">
      <div className="welcome-content">
        <h1 className="welcome-title">SIGN BATTLE</h1>
        <p className="welcome-subtitle">Cath Comharthaíochta</p>

        <div className="welcome-divider" />

        {/* Seanfhocal */}
        <div className="welcome-proverb">
          <span className="proverb-ga">&ldquo;{proverb.ga}&rdquo;</span>
          <span className="proverb-en">{proverb.en}</span>
        </div>

        {/* Sign preview cards — trilingual */}
        <div className="gesture-cards">
          {previewSigns.map((sign) => (
            <SignCard key={sign.id} sign={sign} compact />
          ))}
        </div>

        {/* Main actions */}
        <div className="welcome-actions">
          <button className="btn btn-primary" onClick={onModules}>
            Foghlaim — Learn
          </button>

          <button className="btn btn-primary" onClick={onTrain}>
            {trained ? 'Retrain Signs' : 'Train Signs'}
          </button>

          {trained && (
            <button className="btn" onClick={onPlay} style={{ animationDelay: '0.1s' }}>
              Cluiche — Play
            </button>
          )}
        </div>

        {trained && (
          <div className="trained-badge">
            Signs trained &mdash; ready to battle
          </div>
        )}

        {/* Secondary nav */}
        <div className="welcome-nav">
          <button className="btn btn-small" onClick={onAbout}>Faoin ISL</button>
          <button className="btn btn-small" onClick={onSettings}>Socruithe</button>
        </div>

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
