import { useRef } from 'react';
import { GESTURES } from '../gestures';
import './GestureManager.css';

/**
 * Gesture management panel: shows saved gestures with delete/clear/export/import.
 */
export default function GestureManager({
  gestureSummary,
  onDeleteGesture,
  onClearAll,
  onExport,
  onImport,
}) {
  const fileInputRef = useRef(null);

  // Map gesture ids to their display names
  const gestureMap = {};
  for (const g of GESTURES) {
    gestureMap[g.id] = g;
  }

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (gestureSummary.length === 0) return null;

  return (
    <div className="gm">
      <h3 className="gm-title">Saved Gestures</h3>

      <div className="gm-list">
        {gestureSummary.map((g) => {
          const info = gestureMap[g.id];
          return (
            <div className="gm-item" key={g.id}>
              <div className="gm-item-info">
                <span className="gm-item-icon">{info?.icon || '?'}</span>
                <div className="gm-item-text">
                  <span className="gm-item-name">
                    {info?.en || g.id}
                    <span className="gm-item-ga">{info?.ga}</span>
                  </span>
                  <span className="gm-item-meta">
                    {g.sampleCount} samples &middot; {formatDate(g.updatedAt)}
                  </span>
                </div>
              </div>
              <button
                className="gm-delete"
                onClick={() => onDeleteGesture(g.id)}
                title={`Delete ${info?.en || g.id}`}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      <div className="gm-actions">
        <button className="btn btn-small" onClick={onExport}>
          Export
        </button>
        <button className="btn btn-small" onClick={handleImportClick}>
          Import
        </button>
        <button className="btn btn-small gm-clear" onClick={onClearAll}>
          Clear All
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
