import { useState } from 'react';
import { getModuleSigns, getModuleTrainableSigns } from '../data/signs';
import { getModuleById } from '../data/modules';
import SignCard from './SignCard';
import './ModuleDetail.css';

/**
 * Module detail screen — shows three phases: Foghlaim (Learn), Cleachtadh (Practice), Cluiche (Game).
 */
export default function ModuleDetail({
  moduleId,
  onStartTraining,
  onStartGame,
  onBack,
  trained,
}) {
  const mod = getModuleById(moduleId);
  const allSigns = getModuleSigns(moduleId);
  const trainable = getModuleTrainableSigns(moduleId);
  const [expandedSign, setExpandedSign] = useState(null);

  if (!mod) return null;

  return (
    <div className="mod-detail radial-bg">
      <div className="mod-detail-content">
        <button className="btn btn-small mod-detail-back" onClick={onBack}>
          &larr; Ar Ais
        </button>

        <div className="mod-detail-header">
          <span className="mod-detail-icon">{mod.icon}</span>
          <h1 className="mod-detail-title">{mod.ga}</h1>
          <p className="mod-detail-subtitle">{mod.en}</p>
        </div>

        {mod.proverbOnStart && (
          <p className="mod-detail-proverb">
            &ldquo;{mod.proverbOnStart}&rdquo;
          </p>
        )}

        <div className="mod-detail-divider" />

        {/* ── Phase 1: Foghlaim (Learn) ─────────────────── */}
        <section className="mod-phase">
          <h2 className="mod-phase-title">
            <span className="mod-phase-ga">Foghlaim</span> Learn
          </h2>
          <p className="mod-phase-desc">
            Browse all {allSigns.length} signs in this module. Tap a sign to see details.
          </p>

          <div className="mod-sign-grid">
            {allSigns.map((sign) => (
              <div
                key={sign.id}
                className="mod-sign-item"
                onClick={() => setExpandedSign(expandedSign === sign.id ? null : sign.id)}
              >
                <SignCard
                  sign={sign}
                  compact={expandedSign !== sign.id}
                  showDetails={expandedSign === sign.id}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="mod-detail-divider" />

        {/* ── Phase 2: Cleachtadh (Practice) ────────────── */}
        <section className="mod-phase">
          <h2 className="mod-phase-title">
            <span className="mod-phase-ga">Cleachtadh</span> Practice
          </h2>
          <p className="mod-phase-desc">
            Train the {trainable.length} recognisable signs with your camera.
            {trainable.length < allSigns.length && (
              <span className="mod-phase-note">
                {' '}({allSigns.length - trainable.length} signs require movement and are learn-only for now.)
              </span>
            )}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => onStartTraining(moduleId)}
          >
            Start Cleachtadh
          </button>
        </section>

        <div className="mod-detail-divider" />

        {/* ── Phase 3: Cluiche (Game) ───────────────────── */}
        <section className="mod-phase">
          <h2 className="mod-phase-title">
            <span className="mod-phase-ga">Cluiche</span> Game
          </h2>
          <p className="mod-phase-desc">
            Test your knowledge — perform the correct sign when prompted.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => onStartGame(moduleId)}
            disabled={!trained}
          >
            {trained ? 'Start Cluiche' : 'Train signs first'}
          </button>
        </section>
      </div>
    </div>
  );
}
