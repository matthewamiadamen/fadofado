import { getAchievement } from '../data/achievements';
import { getRandomProverb } from '../data/seanfhocail';
import { useState } from 'react';
import './ScoreScreen.css';

export default function ScoreScreen({ score, total, onPlayAgain, onHome }) {
  const achievement = getAchievement(score, total);
  const [proverb] = useState(() => getRandomProverb(achievement.proverb.ga));

  return (
    <div className="score radial-bg">
      <div className="score-content">
        <p className="score-label-top">CLUICHE CRÍOCHNAITHE</p>
        <p className="score-label-sub">Battle Complete</p>

        <h1 className="score-count">
          {score} <span className="score-slash">/</span> {total}
        </h1>

        {/* Achievement title */}
        <div className="score-achievement">
          <span className="score-achievement-title">{achievement.title}</span>
          <span className="score-achievement-en">{achievement.titleEn}</span>
        </div>

        {/* Achievement proverb */}
        <div className="score-proverb">
          <span className="proverb-ga">&ldquo;{achievement.proverb.ga}&rdquo;</span>
          <span className="proverb-en">{achievement.proverb.en}</span>
        </div>

        {/* Random encouragement proverb */}
        <div className="score-proverb score-proverb-extra">
          <span className="proverb-ga">&ldquo;{proverb.ga}&rdquo;</span>
          <span className="proverb-en">{proverb.en}</span>
        </div>

        <div className="score-actions">
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Arís — Play Again
          </button>
          <button className="btn" onClick={onHome}>
            Baile — Home
          </button>
        </div>
      </div>
    </div>
  );
}
