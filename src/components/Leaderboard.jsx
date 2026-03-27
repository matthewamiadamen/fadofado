import { useState, useMemo } from 'react';
import { getTopScores, getPlayerName, setPlayerName } from '../services/leaderboard';
import './Leaderboard.css';

const MODE_LABELS = {
  game: 'Sign Game',
  fingerspell: 'Fingerspell',
  quiz: 'Quiz',
};

export default function Leaderboard({ onBack }) {
  const [mode, setMode] = useState('game');
  const [, forceUpdate] = useState(0);
  const scores = useMemo(() => getTopScores(mode, 20), [mode, forceUpdate]); // eslint-disable-line

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(() => getPlayerName());

  function handleSaveName() {
    setPlayerName(nameInput);
    setEditingName(false);
  }

  const playerName = getPlayerName();

  return (
    <div className="leaderboard radial-bg" role="region" aria-label="Leaderboard">
      <div className="leaderboard-content">
        <button className="btn btn-small leaderboard-back" onClick={onBack}>&larr; Ar Ais</button>

        <h1 className="leaderboard-title">Clar Ceannais</h1>
        <p className="leaderboard-subtitle">Leaderboard</p>

        {/* Player name */}
        <div className="leaderboard-player">
          {editingName ? (
            <div className="leaderboard-name-edit">
              <input
                className="leaderboard-name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                maxLength={20}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
              <button className="btn btn-small" onClick={handleSaveName}>Save</button>
            </div>
          ) : (
            <button className="leaderboard-name-btn" onClick={() => setEditingName(true)}>
              {playerName || 'Set your name'} &#9998;
            </button>
          )}
        </div>

        {/* Mode tabs */}
        <div className="leaderboard-tabs" role="tablist">
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={mode === key}
              className={`leaderboard-tab ${mode === key ? 'leaderboard-tab-active' : ''}`}
              onClick={() => setMode(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scores table */}
        {scores.length === 0 ? (
          <p className="leaderboard-empty">No scores yet. Play a game to get on the board!</p>
        ) : (
          <div className="leaderboard-table" role="table" aria-label={`${MODE_LABELS[mode]} scores`}>
            <div className="leaderboard-header" role="row">
              <span role="columnheader" className="lb-col-rank">#</span>
              <span role="columnheader" className="lb-col-name">Player</span>
              <span role="columnheader" className="lb-col-score">Score</span>
              <span role="columnheader" className="lb-col-date">Date</span>
            </div>
            {scores.map((entry, i) => (
              <div
                key={`${entry.date}-${i}`}
                className={`leaderboard-row ${i < 3 ? `lb-top-${i + 1}` : ''}`}
                role="row"
              >
                <span className="lb-col-rank lb-rank">{i + 1}</span>
                <span className="lb-col-name lb-name">{entry.name}</span>
                <span className="lb-col-score lb-score">
                  {entry.score}/{entry.total}
                  <small className="lb-pct">{entry.percent}%</small>
                </span>
                <span className="lb-col-date lb-date">
                  {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
