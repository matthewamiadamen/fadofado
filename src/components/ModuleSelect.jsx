import { MODULES } from '../data/modules';
import { getModuleSigns, getModuleTrainableSigns } from '../data/signs';
import { getRandomProverb } from '../data/seanfhocail';
import { useState } from 'react';
import './ModuleSelect.css';

/**
 * Module selection screen — shows available learning modules with progress.
 */
export default function ModuleSelect({
  moduleProgress,
  onSelectModule,
  onBack,
}) {
  const [proverb] = useState(() => getRandomProverb());

  return (
    <div className="module-select radial-bg">
      <div className="module-select-content">
        <button className="btn btn-small module-select-back" onClick={onBack}>
          &larr; Ar Ais
        </button>

        <h1 className="module-select-title">Foghlaim</h1>
        <p className="module-select-subtitle">Learn ISL</p>

        <div className="module-select-divider" />

        <div className="module-select-proverb">
          <span className="proverb-ga">&ldquo;{proverb.ga}&rdquo;</span>
          <span className="proverb-en">{proverb.en}</span>
        </div>

        <div className="module-list">
          {MODULES.map((mod) => {
            const allSigns = getModuleSigns(mod.id);
            const trainable = getModuleTrainableSigns(mod.id);
            const progress = moduleProgress[mod.id] || 0;
            const isLocked = mod.unlockCriteria && (moduleProgress[mod.unlockCriteria.moduleId] || 0) < mod.unlockCriteria.minAccuracy;

            return (
              <button
                key={mod.id}
                className={`module-card ${isLocked ? 'module-card-locked' : ''}`}
                onClick={() => !isLocked && onSelectModule(mod.id)}
                disabled={isLocked}
              >
                <div className="module-card-header">
                  <span className="module-card-icon">{mod.icon}</span>
                  <div className="module-card-titles">
                    <span className="module-card-ga">{mod.ga}</span>
                    <span className="module-card-en">{mod.en}</span>
                  </div>
                </div>

                <p className="module-card-desc">{mod.description}</p>

                <div className="module-card-stats">
                  <span>{allSigns.length} signs</span>
                  <span>&middot;</span>
                  <span>{trainable.length} trainable</span>
                </div>

                {/* Progress bar */}
                <div className="module-progress-track">
                  <div
                    className="module-progress-fill"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>

                {isLocked && (
                  <span className="module-card-lock">
                    🔒 Complete {MODULES.find((m) => m.id === mod.unlockCriteria.moduleId)?.ga || 'previous module'} with {Math.round(mod.unlockCriteria.minAccuracy * 100)}% to unlock
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
