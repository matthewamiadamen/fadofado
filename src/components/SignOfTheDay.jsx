import { useMemo } from 'react';
import { getAllSigns } from '../data/signs';
import { getModuleById } from '../data/modules';
import { getSignOfTheDay } from '../services/srs';
import './SignOfTheDay.css';

export default function SignOfTheDay({ onPractice }) {
  const sign = useMemo(() => {
    const allSigns = getAllSigns();
    return getSignOfTheDay(allSigns);
  }, []);

  if (!sign) return null;

  const mod = sign.module ? getModuleById(sign.module) : null;

  return (
    <div className="sotd" role="region" aria-label="Sign of the Day">
      <p className="sotd-label">Comhartha an Lae</p>
      <p className="sotd-label-en">Sign of the Day</p>

      <div className="sotd-card">
        <span className="sotd-icon">{sign.icon}</span>
        <div className="sotd-info">
          <h3 className="sotd-en">{sign.en}</h3>
          <p className="sotd-ga">{sign.ga}</p>
          {sign.gaPhonetic && <p className="sotd-phonetic">/{sign.gaPhonetic}/</p>}
          {mod && <span className="sotd-module">{mod.icon} {mod.ga}</span>}
        </div>
      </div>

      {sign.instruction && (
        <p className="sotd-instruction">{sign.instruction}</p>
      )}

      <button className="btn btn-small sotd-practice" onClick={() => onPractice(sign)}>
        Practice This Sign
      </button>
    </div>
  );
}
