import './ScoreScreen.css';

const RESULT_LABELS = {
  0: 'Keep training, warrior',
  1: 'A start is made',
  2: 'Getting there',
  3: 'Well fought',
  4: 'Mighty!',
  5: 'Laoch! Champion of Ireland',
};

export default function ScoreScreen({ score, total, onPlayAgain, onHome }) {
  const label = RESULT_LABELS[score] ?? 'Well played';

  return (
    <div className="score radial-bg">
      <div className="score-content">
        <p className="score-label-top">BATTLE COMPLETE</p>

        <h1 className="score-count">
          {score} <span className="score-slash">/</span> {total}
        </h1>

        <p className="score-result">{label}</p>

        <div className="score-actions">
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="btn" onClick={onHome}>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
