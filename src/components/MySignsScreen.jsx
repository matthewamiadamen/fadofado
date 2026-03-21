import GestureManager from './GestureManager';
import './MySignsScreen.css';

export default function MySignsScreen({
  gestureSummary,
  onDeleteGesture,
  onClearAll,
  onExport,
  onImport,
  onBack,
}) {
  return (
    <div className="my-signs radial-bg">
      <div className="my-signs-content">
        <button className="btn btn-small my-signs-back" onClick={onBack}>
          &larr; Ar Ais
        </button>

        <h1 className="my-signs-title">Mo Chomharthaí Sábháilte</h1>
        <p className="my-signs-subtitle">My Saved Signs</p>

        <div className="my-signs-divider" />

        {gestureSummary.length === 0 ? (
          <p className="my-signs-empty">
            No signs saved yet. Train some signs and they will appear here.
          </p>
        ) : (
          <GestureManager
            gestureSummary={gestureSummary}
            onDeleteGesture={onDeleteGesture}
            onClearAll={onClearAll}
            onExport={onExport}
            onImport={onImport}
          />
        )}
      </div>
    </div>
  );
}
