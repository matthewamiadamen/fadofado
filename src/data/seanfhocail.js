/**
 * Seanfhocail — Irish Proverbs
 * Used throughout the app for encouragement and cultural richness.
 */

export const SEANFHOCAIL = [
  { ga: 'Tús maith, leath na hoibre', en: 'A good start is half the work' },
  { ga: 'Is fearr Gaeilge briste ná Béarla cliste', en: 'Broken Irish is better than clever English' },
  { ga: 'Ní neart go cur le chéile', en: 'There is no strength without unity' },
  { ga: 'Mol an óige agus tiocfaidh sí', en: 'Praise the young and they will flourish' },
  { ga: 'Ar scáth a chéile a mhaireann na daoine', en: 'People live in each other\'s shelter' },
  { ga: 'Is binn béal ina thost', en: 'A silent mouth is sweet' },
  { ga: 'Ní dhéanfadh an saol capall rása d\'asal', en: 'The world would not make a racehorse of a donkey' },
  { ga: 'An rud is annamh is iontach', en: 'What is rare is wonderful' },
  { ga: 'Bíonn gach tosú lag', en: 'Every beginning is weak' },
  { ga: 'Is fearr cara sa chúirt ná punt sa sparán', en: 'A friend in court is better than a pound in the purse' },
  { ga: 'Giorraíonn beirt bóthar', en: 'Two people shorten a road' },
  { ga: 'Ní hé lá na gaoithe lá na scolb', en: 'The windy day is not the day for thatching' },
  { ga: 'Is maith an scáthán súil charad', en: 'A friend\'s eye is a good mirror' },
  { ga: 'Beatha teanga í a labhairt', en: 'The life of a language is to speak it' },
  { ga: 'Maireann croí éadrom i bhfad', en: 'A light heart lives longest' },
  { ga: 'Ní thuigeann an sách an seang', en: 'The well-fed does not understand the lean' },
  { ga: 'Is fearr Gaeilge briste ná Béarla cliste', en: 'Broken Irish is better than clever English' },
];

/**
 * Return a random proverb. Optionally exclude a specific one to avoid repetition.
 */
export function getRandomProverb(excludeGa) {
  const pool = excludeGa
    ? SEANFHOCAIL.filter((p) => p.ga !== excludeGa)
    : SEANFHOCAIL;
  return pool[Math.floor(Math.random() * pool.length)];
}
