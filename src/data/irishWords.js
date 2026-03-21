/**
 * 50 common Irish words with English translations and emoji.
 * Ported from irish_data.py for use in the fingerspelling feature.
 */

export const WORDS = [
  { english: 'Cat', irish: 'Cat', emoji: '\u{1f431}' },
  { english: 'Dog', irish: 'Madra', emoji: '\u{1f415}' },
  { english: 'House', irish: 'Teach', emoji: '\u{1f3e0}' },
  { english: 'Tree', irish: 'Crann', emoji: '\u{1f333}' },
  { english: 'Water', irish: 'Uisce', emoji: '\u{1f4a7}' },
  { english: 'Book', irish: 'Leabhar', emoji: '\u{1f4d6}' },
  { english: 'Sun', irish: 'Grian', emoji: '\u2600\ufe0f' },
  { english: 'Moon', irish: 'Gealach', emoji: '\u{1f319}' },
  { english: 'Star', irish: 'R\u00e9alta', emoji: '\u2b50' },
  { english: 'Fish', irish: 'Iasc', emoji: '\u{1f41f}' },
  { english: 'Bird', irish: '\u00c9an', emoji: '\u{1f426}' },
  { english: 'Flower', irish: 'Bl\u00e1th', emoji: '\u{1f338}' },
  { english: 'Car', irish: 'Carr', emoji: '\u{1f697}' },
  { english: 'Door', irish: 'Doras', emoji: '\u{1f6aa}' },
  { english: 'Window', irish: 'Fuinneog', emoji: '\u{1fa9f}' },
  { english: 'Table', irish: 'Bord', emoji: '\u{1f37d}\ufe0f' },
  { english: 'Chair', irish: 'Cathaoir', emoji: '\u{1fa91}' },
  { english: 'Bread', irish: 'Ar\u00e1n', emoji: '\u{1f35e}' },
  { english: 'Milk', irish: 'Bainne', emoji: '\u{1f95b}' },
  { english: 'Apple', irish: '\u00dall', emoji: '\u{1f34e}' },
  { english: 'Eye', irish: 'S\u00fail', emoji: '\u{1f441}\ufe0f' },
  { english: 'Hand', irish: 'L\u00e1mh', emoji: '\u270b' },
  { english: 'Head', irish: 'Ceann', emoji: '\u{1f9d1}' },
  { english: 'Foot', irish: 'Cos', emoji: '\u{1f9b6}' },
  { english: 'Heart', irish: 'Cro\u00ed', emoji: '\u2764\ufe0f' },
  { english: 'King', irish: 'R\u00ed', emoji: '\u{1f451}' },
  { english: 'Queen', irish: 'Banr\u00edon', emoji: '\u{1f478}' },
  { english: 'Boy', irish: 'Buachaill', emoji: '\u{1f466}' },
  { english: 'Girl', irish: 'Cail\u00edn', emoji: '\u{1f467}' },
  { english: 'Man', irish: 'Fear', emoji: '\u{1f468}' },
  { english: 'Woman', irish: 'Bean', emoji: '\u{1f469}' },
  { english: 'Child', irish: 'P\u00e1iste', emoji: '\u{1f476}' },
  { english: 'School', irish: 'Scoil', emoji: '\u{1f3eb}' },
  { english: 'Teacher', irish: 'M\u00fainteoir', emoji: '\u{1f469}\u200d\u{1f3eb}' },
  { english: 'Friend', irish: 'Cara', emoji: '\u{1f91d}' },
  { english: 'Food', irish: 'Bia', emoji: '\u{1f372}' },
  { english: 'Rain', irish: 'B\u00e1isteach', emoji: '\u{1f327}\ufe0f' },
  { english: 'Wind', irish: 'Gaoth', emoji: '\u{1f4a8}' },
  { english: 'Fire', irish: 'Tine', emoji: '\u{1f525}' },
  { english: 'Earth', irish: 'Talamh', emoji: '\u{1f30d}' },
  { english: 'Mountain', irish: 'Sliabh', emoji: '\u{1f3d4}\ufe0f' },
  { english: 'River', irish: 'Abhainn', emoji: '\u{1f3de}\ufe0f' },
  { english: 'Sea', irish: 'Farraige', emoji: '\u{1f30a}' },
  { english: 'Road', irish: 'B\u00f3thar', emoji: '\u{1f6e4}\ufe0f' },
  { english: 'Shoe', irish: 'Br\u00f3g', emoji: '\u{1f45f}' },
  { english: 'Coat', irish: 'C\u00f3ta', emoji: '\u{1f9e5}' },
  { english: 'Hat', irish: 'Hata', emoji: '\u{1f3a9}' },
  { english: 'Pen', irish: 'Peann', emoji: '\u{1f58a}\ufe0f' },
  { english: 'Ball', irish: 'Liathróid', emoji: '\u26bd' },
  { english: 'Egg', irish: 'Ubh', emoji: '\u{1f95a}' },
];

/** Lookup: english (lowered) → irish */
export const EN_TO_IRISH = Object.fromEntries(
  WORDS.map((w) => [w.english.toLowerCase(), w.irish])
);

/** Strip fadas for comparison */
const FADA_MAP = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' };
export function stripFadas(str) {
  return str.replace(/[áéíóúÁÉÍÓÚ]/g, (ch) => FADA_MAP[ch] || ch);
}

/** Translate an English sentence word-by-word to Irish */
export function translateSentence(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => EN_TO_IRISH[w] || w)
    .join(' ');
}
