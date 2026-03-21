import { useSettings } from '../contexts/SettingsContext';
import './SettingsPanel.css';

export default function SettingsPanel({ onBack }) {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="settings radial-bg">
      <div className="settings-content">
        <button className="btn btn-small settings-back" onClick={onBack}>
          &larr; Ar Ais
        </button>

        <h1 className="settings-title">Socruithe</h1>
        <p className="settings-subtitle">Settings</p>

        <div className="settings-divider" />

        {/* Dominant hand */}
        <div className="settings-group">
          <h2 className="settings-group-title">Dominant Hand</h2>
          <p className="settings-group-desc">
            ISL uses the concept of a dominant hand. Set this to match your signing hand.
            Sign instructions and recognition will adjust accordingly.
          </p>
          <div className="settings-toggle-row">
            <button
              className={`settings-toggle ${settings.dominantHand === 'right' ? 'settings-toggle-active' : ''}`}
              onClick={() => updateSetting('dominantHand', 'right')}
            >
              Right
            </button>
            <button
              className={`settings-toggle ${settings.dominantHand === 'left' ? 'settings-toggle-active' : ''}`}
              onClick={() => updateSetting('dominantHand', 'left')}
            >
              Left
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
