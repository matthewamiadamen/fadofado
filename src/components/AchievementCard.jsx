import { useRef, useCallback } from 'react';
import './AchievementCard.css';

/**
 * Renders a shareable achievement card and provides export-to-image.
 * Uses Canvas API directly — no external dependencies.
 *
 * @param {{ score: number, total: number, title: string, titleEn: string, playerName: string, mode: string }} props
 */
export default function AchievementCard({ score, total, title, titleEn, playerName, mode }) {
  const cardRef = useRef(null);

  const handleShare = useCallback(async () => {
    const canvas = document.createElement('canvas');
    const w = 600;
    const h = 400;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Background
    const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 300);
    grad.addColorStop(0, '#1a3a22');
    grad.addColorStop(1, '#0a1a0f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    // Corner decorations
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.25)';
    ctx.lineWidth = 1;
    const corners = [[24, 24], [w - 24, 24], [24, h - 24], [w - 24, h - 24]];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // App name
    ctx.fillStyle = '#c9a84c';
    ctx.font = '700 14px serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('LAMHA', w / 2, 56);

    // Subtitle
    ctx.fillStyle = '#a68a45';
    ctx.font = '12px serif';
    ctx.fillText('Learn Irish Sign Language', w / 2, 76);

    // Divider
    const divGrad = ctx.createLinearGradient(w / 2 - 60, 0, w / 2 + 60, 0);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.5, '#c9a84c');
    divGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 60, 90);
    ctx.lineTo(w / 2 + 60, 90);
    ctx.stroke();

    // Score
    ctx.fillStyle = '#c9a84c';
    ctx.font = '700 72px serif';
    ctx.textAlign = 'center';
    const scoreText = `${score}`;
    const totalText = ` / ${total}`;
    const scoreWidth = ctx.measureText(scoreText).width;
    ctx.fillText(scoreText, w / 2 - ctx.measureText(totalText).width / 2, 170);
    ctx.fillStyle = '#a68a45';
    ctx.font = '400 42px serif';
    ctx.fillText(totalText, w / 2 + scoreWidth / 2 - 10, 170);

    // Achievement title
    ctx.fillStyle = '#e8c97a';
    ctx.font = '700 28px serif';
    ctx.fillText(title, w / 2, 220);

    ctx.fillStyle = '#b5a88e';
    ctx.font = 'italic 16px serif';
    ctx.fillText(titleEn, w / 2, 248);

    // Player name
    if (playerName) {
      ctx.fillStyle = '#f0e8d5';
      ctx.font = '16px serif';
      ctx.fillText(playerName, w / 2, 290);
    }

    // Mode label
    ctx.fillStyle = '#b5a88e';
    ctx.font = '11px serif';
    ctx.fillText(mode || 'Game', w / 2, 320);

    // Footer
    ctx.fillStyle = '#7a6230';
    ctx.font = '10px serif';
    ctx.fillText('lamha.app', w / 2, h - 36);

    // Export
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Try Web Share API first (mobile-friendly)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'lamha-achievement.png', { type: 'image/png' });
        const shareData = { files: [file], title: 'Lamha Achievement', text: `I scored ${score}/${total} on Lamha!` };
        try {
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        } catch { /* user cancelled or unsupported — fall through to download */ }
      }

      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lamha-achievement-${score}-${total}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [score, total, title, titleEn, playerName, mode]);

  return (
    <div className="achievement-share">
      {/* Visual preview card (matches canvas output) */}
      <div className="achievement-card" ref={cardRef}>
        <p className="achievement-card-app">LAMHA</p>
        <p className="achievement-card-appsub">Learn Irish Sign Language</p>
        <div className="achievement-card-divider" />
        <p className="achievement-card-score">
          {score} <span className="achievement-card-slash">/</span> {total}
        </p>
        <p className="achievement-card-title">{title}</p>
        <p className="achievement-card-titleen">{titleEn}</p>
        {playerName && <p className="achievement-card-player">{playerName}</p>}
        <p className="achievement-card-mode">{mode}</p>
      </div>

      <button className="btn achievement-share-btn" onClick={handleShare}>
        Share Achievement
      </button>
    </div>
  );
}
