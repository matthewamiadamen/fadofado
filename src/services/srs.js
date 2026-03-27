/**
 * Spaced Repetition System (SRS) for ISL signs.
 *
 * Stores per-sign review data in localStorage:
 *   { signId: { attempts, correct, lastReviewed (ISO), lastResult ('correct'|'incorrect') } }
 *
 * Scheduling algorithm:
 *   - successRate < 0.4  → due every day
 *   - successRate < 0.7  → due every 2 days
 *   - successRate < 0.9  → due every 4 days
 *   - successRate >= 0.9 → due every 7 days
 *   - If last result was incorrect, due immediately (interval = 0)
 *   - Never-reviewed signs are always due
 */

const SRS_KEY = 'isl-srs-data';
const STREAK_KEY = 'isl-activity-streak';

// ── SRS Data ───────────────────────────────────────────────

export function loadSrsData() {
  try {
    const raw = localStorage.getItem(SRS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSrsData(data) {
  try {
    localStorage.setItem(SRS_KEY, JSON.stringify(data));
  } catch { /* storage full — degrade gracefully */ }
}

/**
 * Record a review result for a sign.
 * @param {string} signId
 * @param {boolean} correct
 */
export function recordSignResult(signId, correct) {
  const data = loadSrsData();
  const existing = data[signId] || { attempts: 0, correct: 0, lastReviewed: null, lastResult: null };

  existing.attempts += 1;
  if (correct) existing.correct += 1;
  existing.lastReviewed = new Date().toISOString();
  existing.lastResult = correct ? 'correct' : 'incorrect';

  data[signId] = existing;
  saveSrsData(data);

  // Also record activity for streak tracking
  recordActivity();

  return existing;
}

/**
 * Get the SRS record for a single sign.
 */
export function getSignSrsData(signId) {
  const data = loadSrsData();
  return data[signId] || null;
}

/**
 * Get the interval (in days) before next review is due.
 */
function getInterval(record) {
  if (!record || record.attempts === 0) return 0; // never reviewed → due now
  if (record.lastResult === 'incorrect') return 0; // got it wrong → review soon

  const successRate = record.correct / record.attempts;
  if (successRate < 0.4) return 1;
  if (successRate < 0.7) return 2;
  if (successRate < 0.9) return 4;
  return 7;
}

/**
 * Check if a sign is due for review.
 */
export function isSignDue(signId) {
  const data = loadSrsData();
  const record = data[signId];
  if (!record || !record.lastReviewed) return true; // never reviewed

  const interval = getInterval(record);
  const lastReviewed = new Date(record.lastReviewed);
  const now = new Date();
  const daysSince = (now - lastReviewed) / (1000 * 60 * 60 * 24);

  return daysSince >= interval;
}

/**
 * Get all signs that are due for review from a list of sign objects.
 * Returns sign objects (not just IDs) sorted by priority:
 *   1. Signs answered incorrectly last time
 *   2. Signs with lowest success rate
 *   3. Signs not reviewed in longest time
 *
 * @param {Array} allSigns - Array of sign objects with .id property
 * @param {number} limit - Max signs to return (default 10)
 */
export function getDueSignsForUser(allSigns, limit = 10) {
  const data = loadSrsData();

  const due = allSigns.filter((sign) => {
    const record = data[sign.id];
    if (!record || !record.lastReviewed) return true;
    const interval = getInterval(record);
    const daysSince = (new Date() - new Date(record.lastReviewed)) / (1000 * 60 * 60 * 24);
    return daysSince >= interval;
  });

  // Sort by priority
  due.sort((a, b) => {
    const ra = data[a.id];
    const rb = data[b.id];

    // Never-reviewed signs first
    if (!ra && rb) return -1;
    if (ra && !rb) return 1;
    if (!ra && !rb) return 0;

    // Incorrect last time comes first
    if (ra.lastResult === 'incorrect' && rb.lastResult !== 'incorrect') return -1;
    if (ra.lastResult !== 'incorrect' && rb.lastResult === 'incorrect') return 1;

    // Lower success rate first
    const srA = ra.attempts > 0 ? ra.correct / ra.attempts : 0;
    const srB = rb.attempts > 0 ? rb.correct / rb.attempts : 0;
    if (srA !== srB) return srA - srB;

    // Oldest review first
    return new Date(ra.lastReviewed) - new Date(rb.lastReviewed);
  });

  return due.slice(0, limit);
}

// ── Progress / Stats ───────────────────────────────────────

/**
 * Get overall progress stats.
 * @param {Array} allSigns - All sign objects
 */
export function getProgressStats(allSigns) {
  const data = loadSrsData();

  let totalAttempts = 0;
  let totalCorrect = 0;
  const signsReviewed = new Set();
  const moduleStats = {};

  for (const sign of allSigns) {
    const record = data[sign.id];
    if (!record || record.attempts === 0) continue;

    signsReviewed.add(sign.id);
    totalAttempts += record.attempts;
    totalCorrect += record.correct;

    const mod = sign.module || 'other';
    if (!moduleStats[mod]) {
      moduleStats[mod] = { attempts: 0, correct: 0, signs: 0 };
    }
    moduleStats[mod].attempts += record.attempts;
    moduleStats[mod].correct += record.correct;
    moduleStats[mod].signs += 1;
  }

  return {
    totalSignsLearned: signsReviewed.size,
    totalSigns: allSigns.length,
    totalAttempts,
    totalCorrect,
    overallAccuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
    moduleStats,
    streak: getStreak(),
  };
}

// ── Streak Tracking ────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Record that the user was active today.
 */
export function recordActivity() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const streakData = raw ? JSON.parse(raw) : { days: [] };
    const today = todayKey();
    if (!streakData.days.includes(today)) {
      streakData.days.push(today);
      // Keep only last 365 days
      if (streakData.days.length > 365) {
        streakData.days = streakData.days.slice(-365);
      }
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify(streakData));
  } catch { /* ignore */ }
}

/**
 * Get current streak (consecutive days ending today or yesterday).
 */
export function getStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const { days } = JSON.parse(raw);
    if (!days || days.length === 0) return 0;

    const sorted = [...days].sort().reverse();
    const today = todayKey();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Streak must include today or yesterday
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev - curr) / 86400000;
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  } catch {
    return 0;
  }
}

// ── Sign of the Day ────────────────────────────────────────

/**
 * Get a deterministic "sign of the day" — stable for the calendar day.
 * Uses a simple hash of the date string to pick an index.
 * @param {Array} allSigns
 */
export function getSignOfTheDay(allSigns) {
  if (!allSigns || allSigns.length === 0) return null;
  const dateStr = todayKey();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % allSigns.length;
  return allSigns[idx];
}
