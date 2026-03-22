import './FingerspellScreen.css';
import ISLAlphabetReference from './ISLAlphabetReference';

export default function FingerspellScreen({
  fsLettersTrained,
  onGame,
  onCommunicate,
  onTrain,
  onBack,
}) {
  return (
    <div className="fspell radial-bg">
      <div className="fspell-content">
        <button className="btn btn-small fspell-back" onClick={onBack}>
          &larr; Ar Ais
        </button>

        <h1 className="fspell-title">LITRIÚ</h1>
        <p className="fspell-subtitle">ISL Fingerspelling</p>

        <div className="fspell-divider" />

        <p className="fspell-desc">
          Train each letter with your webcam using MediaPipe hand tracking.
          Runs entirely in your browser — no backend needed.
        </p>

        <button className="btn btn-primary fspell-train-btn" onClick={onTrain}>
          ✋ Train Letters {fsLettersTrained > 0 ? `(${fsLettersTrained}/26 trained)` : ''}
        </button>

        <div className="fspell-cards">
          <button className="fspell-card" onClick={onGame} disabled={fsLettersTrained === 0}>
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

          <button className="fspell-card" onClick={onCommunicate} disabled={fsLettersTrained === 0}>
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
          <span className="fspell-note-label">Status</span>
          {fsLettersTrained > 0
            ? `${fsLettersTrained} of 26 letters trained — ready to play!`
            : 'Train at least one letter to start playing.'}
        </div>
      </div>

      <ISLAlphabetReference />
    </div>
  );
}
