import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GESTURES, getAllSigns } from '../data/signs';
import { getRandomProverb } from '../data/seanfhocail';
import { getDueSignsForUser } from '../services/srs';
import SignCard from './SignCard';
import SignOfTheDay from './SignOfTheDay';
import './WelcomeScreen.css';

export default function WelcomeScreen({
  trained,
  gestureSummary,
  storageError,
  defaultModelAvailable,
  onQuickStart,
  onTrain,
  onPlay,
  onClearAll,
  onAbout,
  onModules,
  onSettings,
  onMySigns,
  onFingerspell,
  onQuiz,
  onReview,
  onProgress,
  onLeaderboard,
}) {
  const navigate = useNavigate();
  const [proverb] = useState(() => getRandomProverb());

  // Show a small subset of signs as preview cards
  const previewSigns = GESTURES.slice(0, 4);

  // Count due signs for review badge
  const dueCount = useMemo(() => {
    const allSigns = getAllSigns();
    return getDueSignsForUser(allSigns, 100).length;
  }, []);

  function handlePracticeSign() {
    navigate('/review');
  }

  return (
    <div className="welcome radial-bg" role="region" aria-label="Welcome">
      {/* Shamrock backdrop — remove this block to revert shamrocks */}
      <div className="welcome-shamrocks">
        {Array.from({ length: 15 }, (_, i) => (
          <span key={i} className="shamrock">☘</span>
        ))}
      </div>
      {/* End shamrock backdrop */}

      <div className="welcome-content" style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="welcome-title">LÁMHA</h1>
        <p className="welcome-subtitle">Learn Irish Sign Language</p>

        <div className="welcome-divider" />

        {/* Seanfhocal */}
        <div className="welcome-proverb">
          <span className="proverb-ga">&ldquo;{proverb.ga}&rdquo;</span>
          <span className="proverb-en">{proverb.en}</span>
        </div>

        {/* Sign of the Day */}
        <SignOfTheDay onPractice={handlePracticeSign} />

        {/* Sign preview cards — trilingual */}
        <div className="gesture-cards">
          {previewSigns.map((sign) => (
            <SignCard key={sign.id} sign={sign} compact />
          ))}
        </div>

        {/* Main actions */}
        <div className="welcome-actions">
          {defaultModelAvailable && (
            <button className="btn" onClick={onQuickStart}>
              Quick Start — Use Default Model
            </button>
          )}

          <button className="btn" onClick={onModules}>
            Foghlaim — Learn
          </button>

          <button className="btn" onClick={onTrain}>
            {trained ? 'Retrain Signs' : 'Train Signs'}
          </button>

          {trained && (
            <button className="btn" onClick={onPlay}>
              Cluiche — Play
            </button>
          )}

          <button className="btn" onClick={onFingerspell}>
            Litriú — Fingerspell
          </button>

          <button className="btn" onClick={onQuiz}>
            Triail — Quiz
          </button>

          <button className="btn" onClick={onReview}>
            Athbhreithniú — Review
            {dueCount > 0 && <span className="welcome-badge">{dueCount}</span>}
          </button>
        </div>

        {trained && (
          <div className="trained-badge">
            Signs trained &mdash; ready to battle
          </div>
        )}

        {/* Secondary nav */}
        <div className="welcome-nav">
          <button className="btn btn-small" onClick={onProgress}>Dul Chun Cinn</button>
          <button className="btn btn-small" onClick={onLeaderboard}>Clár Ceannais</button>
          {gestureSummary.length > 0 && (
            <button className="btn btn-small" onClick={onMySigns}>
              Mo Chomharthaí ({gestureSummary.length})
            </button>
          )}
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
      </div>
    </div>
  );
}
