import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSigns } from '../data/signs';
import { MODULES } from '../data/modules';
import { getProgressStats, getDueSignsForUser } from '../services/srs';
import './ProgressDashboard.css';

export default function ProgressDashboard({ onBack }) {
  const navigate = useNavigate();
  const allSigns = useMemo(() => getAllSigns(), []);
  const stats = useMemo(() => getProgressStats(allSigns), [allSigns]);
  const dueCount = useMemo(() => getDueSignsForUser(allSigns, 100).length, [allSigns]);

  const moduleRows = MODULES.map((mod) => {
    const ms = stats.moduleStats[mod.id];
    const accuracy = ms && ms.attempts > 0 ? Math.round((ms.correct / ms.attempts) * 100) : 0;
    const signsCount = ms ? ms.signs : 0;
    return { mod, accuracy, signsCount };
  });

  return (
    <div className="progress-dash radial-bg" role="region" aria-label="Progress Dashboard">
      <div className="progress-dash-content">
        <button className="btn btn-small progress-dash-back" onClick={onBack}>&larr; Ar Ais</button>

        <h1 className="progress-dash-title">Dul Chun Cinn</h1>
        <p className="progress-dash-subtitle">Your Progress</p>

        {/* Summary cards */}
        <div className="progress-cards">
          <div className="progress-card">
            <span className="progress-card-value">{stats.totalSignsLearned}</span>
            <span className="progress-card-label">Signs Learned</span>
            <span className="progress-card-sub">of {stats.totalSigns}</span>
          </div>

          <div className="progress-card">
            <span className="progress-card-value">{Math.round(stats.overallAccuracy * 100)}%</span>
            <span className="progress-card-label">Accuracy</span>
            <span className="progress-card-sub">{stats.totalCorrect}/{stats.totalAttempts}</span>
          </div>

          <div className="progress-card">
            <span className="progress-card-value">{stats.streak}</span>
            <span className="progress-card-label">Day Streak</span>
            <span className="progress-card-sub">{stats.streak === 1 ? 'day' : 'days'}</span>
          </div>

          <div className="progress-card">
            <span className="progress-card-value">{dueCount}</span>
            <span className="progress-card-label">Due for Review</span>
            {dueCount > 0 && (
              <button
                className="progress-card-action"
                onClick={() => navigate('/review')}
              >
                Review Now
              </button>
            )}
          </div>
        </div>

        {/* Module accuracy bars */}
        <h2 className="progress-section-title">Module Accuracy</h2>
        <div className="progress-modules">
          {moduleRows.map(({ mod, accuracy, signsCount }) => (
            <div key={mod.id} className="progress-module-row">
              <div className="progress-module-header">
                <span className="progress-module-icon">{mod.icon}</span>
                <span className="progress-module-name">{mod.ga}</span>
                <span className="progress-module-pct">{accuracy}%</span>
              </div>
              <div className="progress-bar-track" role="progressbar" aria-valuenow={accuracy} aria-valuemin={0} aria-valuemax={100} aria-label={`${mod.en} accuracy`}>
                <div
                  className="progress-bar-fill"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
              <span className="progress-module-sub">{signsCount} signs practiced</span>
            </div>
          ))}
        </div>

        {/* Signs learned bar (overall) */}
        <h2 className="progress-section-title">Signs Covered</h2>
        <div className="progress-bar-track progress-bar-lg" role="progressbar" aria-valuenow={stats.totalSignsLearned} aria-valuemin={0} aria-valuemax={stats.totalSigns} aria-label="Signs covered">
          <div
            className="progress-bar-fill progress-bar-fill-teal"
            style={{ width: `${stats.totalSigns > 0 ? (stats.totalSignsLearned / stats.totalSigns) * 100 : 0}%` }}
          />
        </div>
        <p className="progress-overall-label">
          {stats.totalSignsLearned} of {stats.totalSigns} signs
        </p>
      </div>
    </div>
  );
}
