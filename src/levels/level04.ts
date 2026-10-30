import { levelFromMap } from './levelMap';

/**
 * Level 4 — long arrows around the edges, some blocked by an arrow several
 * cells away along their line (f and i by j and g).
 * Drafted with the level generator (seed 206), reviewed for readability.
 */
export default levelFromMap(
  4,
  [
    'a^ d  d  d  b  b  b>',
    'a  .  .  d  .  e  c^',
    '.  .  .  dv .  ev c',
    'f^ .  .  .  .  j  g^',
    'f  f  f  f  .  j  g',
    '.  .  .  h< h  j  g',
    'i  i  i  i> .  jv g',
  ],
  { revision: 2 },
);
