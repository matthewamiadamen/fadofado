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
  {
    id: 'mothuchaine',
    en: 'Emotions & Feelings',
    ga: 'Mothúcháine',
    gaPhonetic: 'muh-HOO-kawn-eh',
    description: 'Express how you feel in ISL. Learn signs for emotions — many involve facial expressions as non-manual markers.',
    icon: '😊',
    order: 3,
    unlockCriteria: { moduleId: 'beannachtai', minAccuracy: 0.5 },
    proverbOnStart: 'Is fearr an tsláinte ná na táinte — Health is better than wealth',
  },
  {
    id: 'teaghlach',
    en: 'Family & People',
    ga: 'Teaghlach',
    gaPhonetic: 'TCHAI-lukh',
    description: 'Signs for family members and people in your life. Important for everyday ISL conversation.',
    icon: '👨‍👩‍👧‍👦',
    order: 4,
    unlockCriteria: { moduleId: 'beannachtai', minAccuracy: 0.5 },
    proverbOnStart: 'Mol an óige agus tiocfaidh sí — Praise the young and they will flourish',
  },
  {
    id: 'bia',
    en: 'Food & Drink',
    ga: 'Bia & Deoch',
    gaPhonetic: 'BEE-ah & JUKH',
    description: 'Essential signs for food, drink, and mealtimes. Practical vocabulary for daily communication.',
    icon: '🍽️',
    order: 5,
    unlockCriteria: { moduleId: 'beannachtai', minAccuracy: 0.5 },
    proverbOnStart: 'Is maith an t-anlann an t-ocras — Hunger is a good sauce',
  },
];

/** Get a module by ID */
export function getModuleById(id) {
  return MODULES.find((m) => m.id === id) || null;
}
