/**
 * Backward-compatibility shim.
 * All sign data now lives in src/data/signs.js.
 * This re-exports GESTURES for existing components that import from here.
 */
export { GESTURES, getTrainableSigns, getAllSigns, getSignById } from './data/signs';
