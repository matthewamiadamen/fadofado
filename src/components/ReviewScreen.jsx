import { useState, useMemo } from 'react';
import { getAllSigns } from '../data/signs';
import { getDueSignsForUser, recordSignResult, loadSrsData } from '../services/srs';
import { getModuleById } from '../data/modules';
import './ReviewScreen.css';

export default function ReviewScreen({ onBack }) {
  const allSigns = useMemo(() => getAllSigns(), []);
  const [dueSigns, setDueSigns] = useState(() => getDueSignsForUser(allSigns, 15));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionResults, setSessionResults] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  const currentSign = dueSigns[currentIdx];
  const srsData = currentSign ? (loadSrsData()[currentSign.id] || null) : null;

  function handleResult(correct) {
    recordSignResult(currentSign.id, correct);
    const newResults = {
      correct: sessionResults.correct + (correct ? 1 : 0),
      total: sessionResults.total + 1,
    };
    setSessionResults(newResults);
    setRevealed(false);

    if (currentIdx + 1 < dueSigns.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setFinished(true);
    }
  }

  function handleRestart() {
    const newDue = getDueSignsForUser(allSigns, 15);
    setDueSigns(newDue);
    setCurrentIdx(0);
    setRevealed(false);
    setSessionResults({ correct: 0, total: 0 });
    setFinished(newDue.length === 0);
  }

  if (dueSigns.length === 0 || finished) {
    return (
      <div className="review radial-bg" role="region" aria-label="Review">
        <div className="review-content">
          <button className="btn btn-small review-back" onClick={onBack}>&larr; Ar Ais</button>
          <h1 className="review-title">Athbhreithniu</h1>
          <p className="review-subtitle">Review</p>

          {finished && sessionResults.total > 0 ? (
            <div className="review-summary">
              <p className="review-done-text">Session complete</p>
              <p className="review-score">
                {sessionResults.correct} / {sessionResults.total} correct
              </p>
              <div className="review-actions">
                <button className="btn" onClick={handleRestart}>Review More</button>
                <button className="btn" onClick={onBack}>Home</button>
              </div>
            </div>
          ) : (
            <div className="review-summary">
              <p className="review-done-icon">&#10003;</p>
              <p className="review-done-text">No signs due for review</p>
              <p className="review-done-sub">Come back later or practice more signs first.</p>
              <button className="btn" onClick={onBack}>Home</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const mod = currentSign.module ? getModuleById(currentSign.module) : null;
  const successRate = srsData && srsData.attempts > 0
    ? Math.round((srsData.correct / srsData.attempts) * 100)
    : null;

  return (
    <div className="review radial-bg" role="region" aria-label="Review session">
      <div className="review-content">
        <button className="btn btn-small review-back" onClick={onBack}>&larr; Ar Ais</button>

        <h1 className="review-title">Athbhreithniu</h1>
        <p className="review-subtitle">Review — {currentIdx + 1} of {dueSigns.length}</p>

        <div className="review-progress-track">
          <div
            className="review-progress-fill"
            style={{ width: `${((currentIdx) / dueSigns.length) * 100}%` }}
          />
        </div>

        <div className="review-card">
          <span className="review-card-icon">{currentSign.icon}</span>
          <h2 className="review-card-en">{currentSign.en}</h2>
          <p className="review-card-ga">{currentSign.ga}</p>
          {currentSign.gaPhonetic && (
            <p className="review-card-phonetic">/{currentSign.gaPhonetic}/</p>
          )}

          {mod && (
            <span className="review-card-module">{mod.icon} {mod.ga}</span>
          )}

          {!revealed ? (
            <button className="btn btn-primary review-reveal" onClick={() => setRevealed(true)}>
              Show Sign Details
            </button>
          ) : (
            <div className="review-details">
              <p className="review-instruction">{currentSign.instruction}</p>

              {currentSign.handshape && (
                <p className="review-meta"><strong>Handshape:</strong> {currentSign.handshape}</p>
              )}
              {currentSign.movement && (
                <p className="review-meta"><strong>Movement:</strong> {currentSign.movement}</p>
              )}
              {currentSign.mnemonicHint && (
                <p className="review-hint">Hint: {currentSign.mnemonicHint}</p>
              )}

              {successRate !== null && (
                <p className="review-history">Previous accuracy: {successRate}% ({srsData.attempts} attempts)</p>
              )}

              <p className="review-prompt">Did you know this sign?</p>
              <div className="review-grade-buttons">
                <button className="btn review-btn-wrong" onClick={() => handleResult(false)}>
                  Not Yet
                </button>
                <button className="btn review-btn-right" onClick={() => handleResult(true)}>
                  Got It
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="review-session-status">
          Session: {sessionResults.correct}/{sessionResults.total}
        </p>
      </div>
    </div>
  );
}
