import './VideoDemo.css';

/**
 * Video demonstration placeholder for a sign.
 * Wired up as if shipping to real users — swap `src` for real video URLs when available.
 */
export default function VideoDemo({ sign, onClose }) {
  // Placeholder video URL pattern — replace with real CDN URLs when available
  const videoSrc = sign.videoUrl || null;

  return (
    <div className="video-demo-overlay" role="dialog" aria-label={`Video for ${sign.en}`}>
      <div className="video-demo-panel">
        <header className="video-demo-header">
          <h3 className="video-demo-title">
            <span className="video-demo-icon" aria-hidden="true">{sign.icon}</span>
            {sign.ga} &mdash; {sign.en}
          </h3>
          <button className="btn btn-small" onClick={onClose} aria-label="Close video">
            &times; Close
          </button>
        </header>

        <div className="video-demo-body">
          {videoSrc ? (
            <video
              className="video-demo-player"
              src={videoSrc}
              controls
              autoPlay
              loop
              playsInline
              aria-label={`Demonstration of the ISL sign for ${sign.en}`}
            >
              Your browser does not support video playback.
            </video>
          ) : (
            <div className="video-demo-placeholder">
              <span className="video-demo-placeholder-icon" aria-hidden="true">&#9658;</span>
              <p>Video demonstration coming soon</p>
              <p className="video-demo-placeholder-sub">
                Community-sourced ISL video for &ldquo;{sign.islGloss}&rdquo; is being prepared.
              </p>
            </div>
          )}
        </div>

        <div className="video-demo-instructions">
          <p><strong>How to sign:</strong> {sign.instruction}</p>
          {sign.commonErrors && sign.commonErrors.length > 0 && (
            <p className="video-demo-errors">
              <strong>Common mistakes:</strong> {sign.commonErrors.join('; ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
