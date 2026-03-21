import './SignCard.css';

/**
 * Trilingual sign display card. Shows ISL gloss, Gaeilge (with phonetic),
 * and English for any sign. Used everywhere a sign appears in the app.
 */
export default function SignCard({ sign, compact, showDetails }) {
  if (!sign) return null;

  const isUnverified = sign.verificationStatus === 'unverified — community input welcome';
  const isCommunity = sign.verificationStatus === 'community-sourced';
  const isWatchOnly = sign.recognitionSupported === false;

  return (
    <div className={`sign-card ${compact ? 'sign-card-compact' : ''}`}>
      {/* Icon + verification badge */}
      <div className="sign-card-header">
        <span className="sign-card-icon">{sign.icon}</span>
        {isWatchOnly && <span className="sign-card-badge sign-card-badge-watch">Watch &amp; Learn</span>}
        {isUnverified && <span className="sign-card-badge sign-card-badge-unverified">Unverified</span>}
      </div>

      {/* ISL Gloss */}
      <span className="sign-card-gloss">{sign.islGloss}</span>

      {/* Gaeilge + phonetic */}
      <div className="sign-card-ga-block">
        <span className="sign-card-ga">{sign.ga}</span>
        {sign.gaPhonetic && (
          <span className="sign-card-phonetic">/{sign.gaPhonetic}/</span>
        )}
      </div>

      {/* English */}
      <span className="sign-card-en">{sign.en}</span>

      {/* ISL note */}
      {!compact && (
        <p className="sign-card-isl-note">
          ISL sign — Irish Sign Language uses its own grammar and vocabulary distinct from English and BSL
        </p>
      )}

      {/* Extended details */}
      {showDetails && (
        <div className="sign-card-details">
          <p className="sign-card-instruction">{sign.instruction}</p>

          {sign.culturalNote && (
            <p className="sign-card-cultural">{sign.culturalNote}</p>
          )}

          {sign.commonErrors && sign.commonErrors.length > 0 && (
            <div className="sign-card-errors">
              <span className="sign-card-detail-label">Common errors:</span>
              <ul>
                {sign.commonErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {sign.mnemonicHint && (
            <p className="sign-card-mnemonic">
              <span className="sign-card-detail-label">Tip:</span> {sign.mnemonicHint}
            </p>
          )}

          {sign.nonManualMarkers && sign.nonManualMarkers.length > 0 && (
            <p className="sign-card-markers">
              <span className="sign-card-detail-label">Non-manual:</span>{' '}
              {sign.nonManualMarkers.map((m) => m.replace(/_/g, ' ')).join(', ')}
            </p>
          )}

          {(isCommunity || isUnverified) && (
            <p className="sign-card-verification">
              {isUnverified
                ? 'This sign is unverified — community input welcome. Please learn from Deaf ISL users.'
                : 'This sign description is community-sourced. We encourage verification with Deaf ISL users.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Minimal inline trilingual display for use in prompts, game HUD, etc.
 */
export function SignLabel({ sign }) {
  if (!sign) return null;
  return (
    <div className="sign-label">
      <span className="sign-label-gloss">{sign.islGloss}</span>
      <span className="sign-label-ga">
        {sign.ga}
        {sign.gaPhonetic && <span className="sign-label-phonetic"> /{sign.gaPhonetic}/</span>}
      </span>
      <span className="sign-label-en">{sign.en}</span>
    </div>
  );
}
