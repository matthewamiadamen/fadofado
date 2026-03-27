/**
 * Leaderboard service — localStorage-based score tracking.
 *
 * Stores top scores for different game modes.
 * Each entry: { name, score, total, date, mode }
 */

const LEADERBOARD_KEY = 'isl-leaderboard';
const MAX_ENTRIES = 50;

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

/**
 * Add a score to the leaderboard.
 * @param {{ name: string, score: number, total: number, mode: string }} entry
 * @returns {number} rank (1-based) of the new entry
 */
export function addScore({ name, score, total, mode }) {
  const entries = loadLeaderboard();
  const newEntry = {
    name: name || 'Anonymous',
    score,
    total,
    percent: total > 0 ? Math.round((score / total) * 100) : 0,
    mode: mode || 'game',
    date: new Date().toISOString(),
  };

  entries.push(newEntry);

  // Sort by percent desc, then by score desc, then by date desc
  entries.sort((a, b) => {
    if (b.percent !== a.percent) return b.percent - a.percent;
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.date) - new Date(a.date);
  });

  // Trim to max
  const trimmed = entries.slice(0, MAX_ENTRIES);
  saveLeaderboard(trimmed);

  // Return rank of the new entry
  const rank = trimmed.findIndex(
    (e) => e.date === newEntry.date && e.score === newEntry.score && e.name === newEntry.name
  );
  return rank + 1;
}

/**
 * Get top scores, optionally filtered by mode.
 * @param {string} [mode] - Filter by game mode
 * @param {number} [limit=10]
 */
export function getTopScores(mode, limit = 10) {
  const entries = loadLeaderboard();
  const filtered = mode ? entries.filter((e) => e.mode === mode) : entries;
  return filtered.slice(0, limit);
}

/**
 * Get the user's player name from localStorage.
 */
export function getPlayerName() {
  return localStorage.getItem('isl-player-name') || '';
}

/**
 * Set the user's player name.
 */
export function setPlayerName(name) {
  localStorage.setItem('isl-player-name', (name || '').trim());
}
