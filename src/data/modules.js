/**
 * Learning modules — structured progression through ISL signs.
 */

export const MODULES = [
  {
    id: 'uimhreacha',
    en: 'Alphabet & Numbers',
    ga: 'An Aibítir & Uimhreacha',
    gaPhonetic: 'on AB-ih-teer & IV-rah-kha',
    description: 'Learn ISL numbers 0–10. These one-handed static signs are the perfect starting point.',
    icon: '🔢',
    order: 1,
    unlockCriteria: null, // always available
    proverbOnStart: 'Tús maith, leath na hoibre — A good start is half the work',
  },
  {
    id: 'beannachtai',
    en: 'Greetings & Basics',
    ga: 'Beannachtaí',
    gaPhonetic: 'BAN-ukh-tee',
    description: 'Essential ISL greetings and everyday signs. Some require movement and are learn-only for now.',
    icon: '👋',
    order: 2,
    unlockCriteria: { moduleId: 'uimhreacha', minAccuracy: 0.6 },
    proverbOnStart: 'Is fearr Gaeilge briste ná Béarla cliste — Broken Irish is better than clever English',
  },
];

/** Get a module by ID */
export function getModuleById(id) {
  return MODULES.find((m) => m.id === id) || null;
}
