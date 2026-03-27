import './LoadingScreen.css';

export default function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="Loading">
      <div className="loading-shamrock" aria-hidden="true">&#9752;</div>
      <h1 className="loading-title">LAMHA</h1>
      <p className="loading-subtitle">Loading...</p>
      <div className="loading-bar">
        <div className="loading-bar-fill" />
      </div>
    </div>
  );
}
