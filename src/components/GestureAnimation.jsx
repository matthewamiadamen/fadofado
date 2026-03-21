import './GestureAnimation.css';

/**
 * Animated SVG hand illustrations for each gesture.
 * 140x160px viewBox, gold/cream palette, looping CSS keyframe animations.
 */
export default function GestureAnimation({ gestureId }) {
  if (gestureId === 'love') return <LoveAnimation />;
  if (gestureId === 'welcome') return <WelcomeAnimation />;
  if (gestureId === 'cheers') return <CheersAnimation />;
  return null;
}

/* ── Love: two hands with V-shaped (index+middle) fingers meeting ──── */
function LoveHand({ className, mirror }) {
  return (
    <svg
      className={className}
      viewBox="0 0 140 160"
      width="70"
      height="80"
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
    >
      {/* Palm */}
      <path
        d="M40,70 Q36,58 42,50 L50,50 L90,50 Q96,58 92,70 L92,110 Q92,128 70,132 Q48,128 40,110 Z"
        fill="#c9a84c"
        stroke="#a8873a"
        strokeWidth="1"
      />
      {/* Index finger — extended, angled outward */}
      <path
        d="M48,50 Q46,28 42,12 Q40,4 46,2 Q52,0 54,8 Q56,24 56,50"
        fill="#c9a84c"
        stroke="#a8873a"
        strokeWidth="0.8"
      />
      <ellipse cx="44" cy="4" rx="3.5" ry="2" fill="#f0e8d5" opacity="0.6" />
      {/* Middle finger — extended, angled inward */}
      <path
        d="M62,50 Q64,26 68,10 Q70,2 76,4 Q82,6 80,14 Q76,30 74,50"
        fill="#c9a84c"
        stroke="#a8873a"
        strokeWidth="0.8"
      />
      <ellipse cx="74" cy="6" rx="3.5" ry="2" fill="#f0e8d5" opacity="0.6" />
      {/* Ring finger — curled into palm */}
      <path
        d="M78,52 Q82,42 86,40 Q92,38 92,46 Q92,52 86,56 L80,58"
        fill="#c9a84c"
        stroke="#a8873a"
        strokeWidth="0.6"
      />
      {/* Pinky — curled into palm */}
      <path
        d="M88,58 Q94,54 98,54 Q104,54 102,62 Q100,68 94,66"
        fill="#c9a84c"
        stroke="#a8873a"
        strokeWidth="0.6"
      />
      {/* Thumb — curled across palm */}
      <path
        d="M40,70 Q30,64 26,54 Q24,46 30,42 Q36,38 40,46 L42,54"
        fill="#c9a84c"
        stroke="#a8873a"
        strokeWidth="0.8"
      />
      {/* Knuckle highlights */}
      <ellipse cx="52" cy="50" rx="4" ry="2.5" fill="#f0e8d5" opacity="0.2" />
      <ellipse cx="68" cy="50" rx="4" ry="2.5" fill="#f0e8d5" opacity="0.2" />
      {/* Wrist */}
      <rect x="48" y="128" width="36" height="28" rx="10" fill="#c9a84c" opacity="0.7" />
    </svg>
  );
}

function LoveAnimation() {
  return (
    <div className="ga-love" aria-label="Two hands forming a heart with V-shaped fingers">
      <LoveHand className="ga-love-left" />
      <LoveHand className="ga-love-right" mirror />
    </div>
  );
}

/* ── Welcome: single open palm waving ──────────────────────────────── */
function WelcomeAnimation() {
  return (
    <div className="ga-welcome" aria-label="Hand waving">
      <svg className="ga-welcome-hand" viewBox="0 0 140 160" width="80" height="92">
        {/* Palm */}
        <path
          d="M35,72 Q32,60 38,52 L46,52 L94,52 Q100,60 96,72 L96,112 Q96,130 70,134 Q44,130 35,112 Z"
          fill="#c9a84c"
          stroke="#a8873a"
          strokeWidth="1"
        />
        {/* Thumb — spread left */}
        <path
          d="M35,68 Q24,62 18,50 Q14,40 20,34 Q28,28 34,38 L36,50"
          fill="#c9a84c"
          stroke="#a8873a"
          strokeWidth="0.8"
        />
        <ellipse cx="19" cy="36" rx="3" ry="2.2" fill="#f0e8d5" opacity="0.5" />
        {/* Index finger */}
        <rect x="40" y="10" width="12" height="46" rx="6" fill="#c9a84c" stroke="#a8873a" strokeWidth="0.7" />
        <ellipse cx="46" cy="12" rx="3.5" ry="2" fill="#f0e8d5" opacity="0.5" />
        {/* Middle finger (tallest) */}
        <rect x="55" y="2" width="13" height="54" rx="6.5" fill="#c9a84c" stroke="#a8873a" strokeWidth="0.7" />
        <ellipse cx="61.5" cy="4" rx="4" ry="2.2" fill="#f0e8d5" opacity="0.5" />
        {/* Ring finger */}
        <rect x="71" y="10" width="12" height="46" rx="6" fill="#c9a84c" stroke="#a8873a" strokeWidth="0.7" />
        <ellipse cx="77" cy="12" rx="3.5" ry="2" fill="#f0e8d5" opacity="0.5" />
        {/* Pinky (shortest) */}
        <rect x="86" y="22" width="11" height="36" rx="5.5" fill="#c9a84c" stroke="#a8873a" strokeWidth="0.7" />
        <ellipse cx="91.5" cy="24" rx="3" ry="1.8" fill="#f0e8d5" opacity="0.5" />
        {/* Finger creases */}
        <line x1="42" y1="34" x2="50" y2="34" stroke="#a8873a" strokeWidth="0.4" opacity="0.4" />
        <line x1="57" y1="30" x2="66" y2="30" stroke="#a8873a" strokeWidth="0.4" opacity="0.4" />
        <line x1="73" y1="34" x2="81" y2="34" stroke="#a8873a" strokeWidth="0.4" opacity="0.4" />
        <line x1="88" y1="38" x2="95" y2="38" stroke="#a8873a" strokeWidth="0.4" opacity="0.4" />
        {/* Palm lines */}
        <path d="M44,70 Q60,62 90,68" stroke="#a8873a" strokeWidth="0.5" fill="none" opacity="0.3" />
        <path d="M42,82 Q58,76 88,80" stroke="#a8873a" strokeWidth="0.4" fill="none" opacity="0.25" />
        {/* Wrist */}
        <rect x="46" y="130" width="38" height="26" rx="10" fill="#c9a84c" opacity="0.7" />
      </svg>
    </div>
  );
}

/* ── Cheers: closed fist with thumb, rising upward ─────────────────── */
function CheersAnimation() {
  return (
    <div className="ga-cheers" aria-label="Fist raised in toast">
      <svg className="ga-cheers-fist" viewBox="0 0 140 160" width="75" height="86">
        {/* Fist body */}
        <rect x="30" y="40" width="80" height="56" rx="18" fill="#c9a84c" stroke="#a8873a" strokeWidth="1" />
        {/* Curled index */}
        <path
          d="M36,46 Q32,34 40,28 Q48,22 52,30 L54,42"
          fill="#c9a84c"
          stroke="#a8873a"
          strokeWidth="0.7"
        />
        {/* Curled middle */}
        <path
          d="M52,42 Q52,28 60,22 Q68,18 72,26 L72,40"
          fill="#c9a84c"
          stroke="#a8873a"
          strokeWidth="0.7"
        />
        {/* Curled ring */}
        <path
          d="M72,44 Q74,30 82,26 Q90,22 92,34 L90,44"
          fill="#c9a84c"
          stroke="#a8873a"
          strokeWidth="0.7"
        />
        {/* Curled pinky */}
        <path
          d="M90,48 Q94,38 100,36 Q108,34 108,44 L104,52"
          fill="#c9a84c"
          stroke="#a8873a"
          strokeWidth="0.7"
        />
        {/* Thumb — resting on curled fingers, visible on left */}
        <path
          d="M30,60 Q16,54 14,42 Q12,30 22,26 Q32,22 36,32 L34,46"
          fill="#c9a84c"
          stroke="#a8873a"
          strokeWidth="0.8"
        />
        <ellipse cx="18" cy="30" rx="4" ry="3" fill="#f0e8d5" opacity="0.45" />
        {/* Knuckle highlights */}
        <ellipse cx="46" cy="38" rx="5" ry="3" fill="#f0e8d5" opacity="0.25" />
        <ellipse cx="64" cy="34" rx="5" ry="3" fill="#f0e8d5" opacity="0.25" />
        <ellipse cx="82" cy="36" rx="5" ry="3" fill="#f0e8d5" opacity="0.25" />
        <ellipse cx="98" cy="42" rx="4" ry="2.5" fill="#f0e8d5" opacity="0.2" />
        {/* Knuckle creases on fist body */}
        <line x1="36" y1="56" x2="106" y2="56" stroke="#a8873a" strokeWidth="0.5" opacity="0.3" />
        <line x1="38" y1="66" x2="104" y2="66" stroke="#a8873a" strokeWidth="0.4" opacity="0.2" />
        {/* Wrist */}
        <rect x="42" y="92" width="56" height="32" rx="12" fill="#c9a84c" opacity="0.7" />
        {/* Forearm hint */}
        <rect x="48" y="120" width="44" height="36" rx="10" fill="#c9a84c" opacity="0.5" />
      </svg>
    </div>
  );
}
