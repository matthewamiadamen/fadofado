import { getAchievement } from '../data/achievements';
import { getRandomProverb } from '../data/seanfhocail';
import { getPlayerName } from '../services/leaderboard';
import { useState } from 'react';
import AchievementCard from './AchievementCard';
import './ScoreScreen.css';

const MODE_LABELS = {
  game: 'Sign Game',
  fingerspell: 'Fingerspell',
  quiz: 'Quiz',
};

export default function ScoreScreen({ score, total, gameMode, onPlayAgain, onHome, onLeaderboard }) {
  const achievement = getAchievement(score, total);
  const [proverb] = useState(() => getRandomProverb(achievement.proverb.ga));
  const [showShare, setShowShare] = useState(false);

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
          {onLeaderboard && (
            <button className="btn" onClick={onLeaderboard}>
              Clár Ceannais
            </button>
          )}
          <button className="btn btn-small" onClick={() => setShowShare((v) => !v)}>
            {showShare ? 'Hide' : 'Share Achievement'}
          </button>
        </div>

        {showShare && (
          <AchievementCard
            score={score}
            total={total}
            title={achievement.title}
            titleEn={achievement.titleEn}
            playerName={getPlayerName()}
            mode={MODE_LABELS[gameMode] || 'Game'}
          />
        )}
      </div>
    </div>
  );
}
