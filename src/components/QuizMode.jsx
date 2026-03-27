import { useState, useCallback, useEffect } from 'react';
import { useAnnounce } from '../hooks/useAnnounce';
import './QuizMode.css';

const TOTAL_ROUNDS = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(allSigns, correctSign, count = 3) {
  const pool = allSigns.filter((s) => s.id !== correctSign.id);
  return shuffle(pool).slice(0, count);
}

export default function QuizMode({ signs, onComplete, onBack }) {
  const announce = useAnnounce();
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [questions, setQuestions] = useState([]);

  // Generate questions on mount
  useEffect(() => {
    const pool = shuffle(signs).slice(0, TOTAL_ROUNDS);
    const qs = pool.map((sign) => {
      const distractors = pickDistractors(signs, sign);
      const options = shuffle([sign, ...distractors]);
      // Randomly choose question type
      const type = Math.random() > 0.5 ? 'en-to-sign' : 'sign-to-en';
      return { sign, options, type };
    });
    setQuestions(qs);
  }, [signs]);

  const current = questions[round];

  const handleSelect = useCallback((option) => {
    if (showResult) return;
    setSelected(option.id);
    const correct = option.id === current.sign.id;
    if (correct) {
      setScore((s) => s + 1);
      announce('Correct!');
    } else {
      announce(`Incorrect. The answer was ${current.sign.en}.`);
    }
    setShowResult(true);
  }, [showResult, current, announce]);

  const handleNext = useCallback(() => {
    if (round + 1 >= questions.length) {
      onComplete(score + (selected === current?.sign.id ? 0 : 0), questions.length);
      return;
    }
    setRound((r) => r + 1);
    setSelected(null);
    setShowResult(false);
  }, [round, questions.length, onComplete, score, selected, current]);

  if (!current) return null;

  const isCorrect = selected === current.sign.id;

  return (
    <div className="quiz-mode" role="region" aria-label="Quiz mode">
      <header className="quiz-header">
        <button className="btn btn-small" onClick={onBack}>
          &larr; Back
        </button>
        <div className="quiz-progress">
          <span className="quiz-round">
            {round + 1} / {questions.length}
          </span>
          <span className="quiz-score">Score: {score}</span>
        </div>
      </header>

      <div className="quiz-progress-bar">
        <div
          className="quiz-progress-fill"
          style={{ width: `${((round + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="quiz-question">
        {current.type === 'en-to-sign' ? (
          <>
            <p className="quiz-prompt">Which sign means:</p>
            <h2 className="quiz-target">{current.sign.en}</h2>
            <p className="quiz-target-sub">{current.sign.ga} <span className="quiz-phonetic">/{current.sign.gaPhonetic}/</span></p>
          </>
        ) : (
          <>
            <p className="quiz-prompt">What does this sign mean?</p>
            <div className="quiz-sign-display">
              <span className="quiz-sign-icon" aria-hidden="true">{current.sign.icon}</span>
              <p className="quiz-sign-gloss">{current.sign.islGloss}</p>
              <p className="quiz-sign-hint">{current.sign.instruction}</p>
            </div>
          </>
        )}
      </div>

      <div className="quiz-options" role="radiogroup" aria-label="Answer choices">
        {current.options.map((opt) => {
          let cls = 'quiz-option';
          if (showResult && opt.id === current.sign.id) cls += ' quiz-option-correct';
          else if (showResult && opt.id === selected) cls += ' quiz-option-wrong';

          return (
            <button
              key={opt.id}
              className={cls}
              onClick={() => handleSelect(opt)}
              disabled={showResult}
              aria-pressed={selected === opt.id}
            >
              <span className="quiz-option-icon" aria-hidden="true">{opt.icon}</span>
              <div className="quiz-option-text">
                {current.type === 'en-to-sign' ? (
                  <>
                    <span className="quiz-option-gloss">{opt.islGloss}</span>
                    <span className="quiz-option-hint">{opt.handshape}</span>
                  </>
                ) : (
                  <>
                    <span className="quiz-option-en">{opt.en}</span>
                    <span className="quiz-option-ga">{opt.ga}</span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className={`quiz-feedback ${isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong'}`} role="status">
          {isCorrect ? (
            <p>Correct! {current.sign.ga} means &ldquo;{current.sign.en}&rdquo;</p>
          ) : (
            <p>
              Not quite. The correct answer was{' '}
              <strong>{current.sign.en}</strong> ({current.sign.ga}).
            </p>
          )}
          {current.sign.culturalNote && (
            <p className="quiz-cultural-note">{current.sign.culturalNote}</p>
          )}
          <button className="btn btn-primary" onClick={handleNext}>
            {round + 1 >= questions.length ? 'See Results' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  );
}
