import './FingerspellScreen.css';
import ISLAlphabetReference from './ISLAlphabetReference';

export default function FingerspellScreen({
  mode,
  onSetMode,
  fsLettersTrained,
  onGame,
  onCommunicate,
  onTrain,
  onBack,
}) {
  const isMP = mode === 'mediapipe';

  return (
    <div className="fspell radial-bg">
      <div className="fspell-content">
        <button className="btn btn-small fspell-back" onClick={onBack}>
          &larr; Ar Ais
        </button>

        <h1 className="fspell-title">LITRIÚ</h1>
        <p className="fspell-subtitle">ISL Fingerspelling</p>

        <div className="fspell-divider" />

        {/* Mode toggle */}
        <div className="fspell-mode-toggle">
          <button
            className={`fspell-mode-btn ${isMP ? 'fspell-mode-active' : ''}`}
            onClick={() => onSetMode('mediapipe')}
          >
            🖐️ MediaPipe
          </button>
          <button
            className={`fspell-mode-btn ${!isMP ? 'fspell-mode-active' : ''}`}
            onClick={() => onSetMode('cnn')}
          >
            🧠 CNN
          </button>
        </div>

        <p className="fspell-desc">
          {isMP
            ? 'Train each letter with your webcam using MediaPipe hand tracking. No backend needed — runs entirely in your browser.'
            : 'Use the Flask backend and our CNN model to recognise ISL hand shapes in real time.'}
        </p>

        {/* Train button (MediaPipe mode) */}
        {isMP && (
          <button className="btn btn-primary fspell-train-btn" onClick={onTrain}>
            ✋ Train Letters {fsLettersTrained > 0 ? `(${fsLettersTrained}/26 trained)` : ''}
          </button>
        )}

        <div className="fspell-cards">
          <button className="fspell-card" onClick={onGame} disabled={isMP && fsLettersTrained === 0}>
            <span className="fspell-card-icon">🎯</span>
            <div className="fspell-card-titles">
              <span className="fspell-card-ga">Cluiche</span>
              <span className="fspell-card-en">Spelling Game</span>
            </div>
            <p className="fspell-card-desc">
              Spell Irish words letter by letter using ISL hand shapes.
              Race the clock and test your fingerspelling!
            </p>
          </button>

          <button className="fspell-card" onClick={onCommunicate} disabled={isMP && fsLettersTrained === 0}>
            <span className="fspell-card-icon">💬</span>
            <div className="fspell-card-titles">
              <span className="fspell-card-ga">Cumarsáid</span>
              <span className="fspell-card-en">Communicate</span>
            </div>
            <p className="fspell-card-desc">
              Spell freely in ISL. Build words and sentences, then
              translate them to Irish.
            </p>
          </button>
        </div>

        <div className="fspell-note">
          <span className="fspell-note-label">
            {isMP ? 'Status' : 'Requires'}
          </span>
          {isMP
            ? (fsLettersTrained > 0
              ? `${fsLettersTrained} of 26 letters trained — ready to play!`
              : 'Train at least one letter to start playing.')
            : 'Flask backend running on port 5000 with the trained CNN model.'}
        </div>
      </div>

      <ISLAlphabetReference />
    </div>
  );
}
