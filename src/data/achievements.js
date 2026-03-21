/**
 * Irish achievement titles based on score performance.
 * Each title is paired with a relevant seanfhocal.
 */

export const ACHIEVEMENT_TIERS = [
  {
    minPercent: 0,
    title: 'Foghlaimeoir',
    titleEn: 'Learner',
    proverb: { ga: 'Bíonn gach tosú lag', en: 'Every beginning is weak' },
  },
  {
    minPercent: 20,
    title: 'Dalta',
    titleEn: 'Student',
    proverb: { ga: 'Tús maith, leath na hoibre', en: 'A good start is half the work' },
  },
  {
    minPercent: 40,
    title: 'Gaiscíoch Óg',
    titleEn: 'Young Warrior',
    proverb: { ga: 'Mol an óige agus tiocfaidh sí', en: 'Praise the young and they will flourish' },
  },
  {
    minPercent: 60,
    title: 'Gaiscíoch',
    titleEn: 'Warrior',
    proverb: { ga: 'Ní neart go cur le chéile', en: 'There is no strength without unity' },
  },
  {
    minPercent: 80,
    title: 'Rí / Banríon',
    titleEn: 'King / Queen',
    proverb: { ga: 'An rud is annamh is iontach', en: 'What is rare is wonderful' },
  },
  {
    minPercent: 100,
    title: 'Laoch na hÉireann',
    titleEn: 'Champion of Ireland',
    proverb: { ga: 'Maireann croí éadrom i bhfad', en: 'A light heart lives longest' },
  },
];

/**
 * Get achievement tier for a given score.
 * @param {number} score - correct answers
 * @param {number} total - total rounds
 */
export function getAchievement(score, total) {
  const percent = total > 0 ? (score / total) * 100 : 0;
  let tier = ACHIEVEMENT_TIERS[0];
  for (const t of ACHIEVEMENT_TIERS) {
    if (percent >= t.minPercent) tier = t;
  }
  return tier;
}
