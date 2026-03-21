/**
 * ISL Fingerspell Alphabet — 26 static one-handed letter signs A–Z.
 * Used for MediaPipe/KNN training mode. Follows the same data shape
 * as src/data/signs.js so TrainingScreen can consume them directly.
 */

export const FINGERSPELL_SIGNS = [
  { id: 'fs-A', en: 'A', ga: 'A', icon: '🅰️', twoHanded: false, instruction: 'Make a fist with your thumb resting on the side of your index finger.' },
  { id: 'fs-B', en: 'B', ga: 'B', icon: '🅱️', twoHanded: false, instruction: 'Hold all four fingers straight up together, thumb tucked across palm.' },
  { id: 'fs-C', en: 'C', ga: 'C', icon: '©️', twoHanded: false, instruction: 'Curve all fingers and thumb into a C shape, like holding a cup.' },
  { id: 'fs-D', en: 'D', ga: 'D', icon: '🇩', twoHanded: false, instruction: 'Index finger points up, other fingers curled with thumb touching middle finger tip forming a circle.' },
  { id: 'fs-E', en: 'E', ga: 'E', icon: '🇪', twoHanded: false, instruction: 'Curl all fingertips down to touch the thumb, making a compact shape.' },
  { id: 'fs-F', en: 'F', ga: 'F', icon: '🇫', twoHanded: false, instruction: 'Touch thumb and index finger into a circle, other three fingers spread straight up.' },
  { id: 'fs-G', en: 'G', ga: 'G', icon: '🇬', twoHanded: false, instruction: 'Point index finger sideways with thumb parallel above it, other fingers curled.' },
  { id: 'fs-H', en: 'H', ga: 'H', icon: '🇭', twoHanded: false, instruction: 'Extend index and middle fingers pointing sideways together, thumb tucked.' },
  { id: 'fs-I', en: 'I', ga: 'I', icon: '🇮', twoHanded: false, instruction: 'Make a fist with only the pinky finger extended straight up.' },
  { id: 'fs-J', en: 'J', ga: 'J', icon: '🇯', twoHanded: false, instruction: 'Start with pinky up (like I), then trace a J shape by curving the pinky downward.' },
  { id: 'fs-K', en: 'K', ga: 'K', icon: '🇰', twoHanded: false, instruction: 'Index and middle fingers point up in a V, thumb pressed against middle finger.' },
  { id: 'fs-L', en: 'L', ga: 'L', icon: '🇱', twoHanded: false, instruction: 'Extend thumb and index finger to form an L shape, other fingers curled.' },
  { id: 'fs-M', en: 'M', ga: 'M', icon: '🇲', twoHanded: false, instruction: 'Place thumb under the first three fingers (index, middle, ring) which fold over it.' },
  { id: 'fs-N', en: 'N', ga: 'N', icon: '🇳', twoHanded: false, instruction: 'Place thumb under the first two fingers (index, middle) which fold over it.' },
  { id: 'fs-O', en: 'O', ga: 'O', icon: '🅾️', twoHanded: false, instruction: 'Touch all fingertips together with the thumb forming a round O shape.' },
  { id: 'fs-P', en: 'P', ga: 'P', icon: '🇵', twoHanded: false, instruction: 'Like K but pointed downward — index and middle fingers point down, thumb on middle finger.' },
  { id: 'fs-Q', en: 'Q', ga: 'Q', icon: '🇶', twoHanded: false, instruction: 'Like G but pointed downward — thumb and index finger point down together.' },
  { id: 'fs-R', en: 'R', ga: 'R', icon: '🇷', twoHanded: false, instruction: 'Cross index and middle fingers pointing up, other fingers curled, thumb tucked.' },
  { id: 'fs-S', en: 'S', ga: 'S', icon: '🇸', twoHanded: false, instruction: 'Make a fist with thumb wrapped across the front of the curled fingers.' },
  { id: 'fs-T', en: 'T', ga: 'T', icon: '🇹', twoHanded: false, instruction: 'Place thumb between index and middle fingers with all fingers curled into a fist.' },
  { id: 'fs-U', en: 'U', ga: 'U', icon: '🇺', twoHanded: false, instruction: 'Extend index and middle fingers straight up together, other fingers curled, thumb tucked.' },
  { id: 'fs-V', en: 'V', ga: 'V', icon: '🇻', twoHanded: false, instruction: 'Extend index and middle fingers in a V shape (spread apart), other fingers curled.' },
  { id: 'fs-W', en: 'W', ga: 'W', icon: '🇼', twoHanded: false, instruction: 'Extend index, middle, and ring fingers spread apart, thumb holds pinky down.' },
  { id: 'fs-X', en: 'X', ga: 'X', icon: '🇽', twoHanded: false, instruction: 'Curl index finger into a hook shape, other fingers curled into a fist.' },
  { id: 'fs-Y', en: 'Y', ga: 'Y', icon: '🇾', twoHanded: false, instruction: 'Extend thumb and pinky finger outward, other three fingers curled down.' },
  { id: 'fs-Z', en: 'Z', ga: 'Z', icon: '🇿', twoHanded: false, instruction: 'Point index finger up and trace the letter Z in the air.' },
];

/** Map letter (uppercase) to the sign id */
export const LETTER_TO_SIGN_ID = Object.fromEntries(
  FINGERSPELL_SIGNS.map((s) => [s.en, s.id])
);

/** Map sign id back to letter */
export const SIGN_ID_TO_LETTER = Object.fromEntries(
  FINGERSPELL_SIGNS.map((s) => [s.id, s.en])
);
