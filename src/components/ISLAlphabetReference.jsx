import { useState } from 'react';
import './ISLAlphabetReference.css';

export default function ISLAlphabetReference() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`islabc ${open ? 'islabc-open' : ''}`}>
      <button
        className="islabc-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Hide ISL alphabet reference' : 'Show ISL alphabet reference'}
      >
        {open ? 'Hide ISL ABCs' : 'ISL ABCs'}
      </button>

      {open && (
        <div className="islabc-panel">
          <div className="islabc-title">ISL Alphabet Reference</div>
          <img
            src="/isl_abcs.png"
            alt="ISL alphabet handshape chart"
            className="islabc-image"
          />
        </div>
      )}
    </div>
  );
}
