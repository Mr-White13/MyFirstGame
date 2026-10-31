import { levelFromMap } from '../../levelMap';

/**
 * Level 6 — first 8×8 board, seven dependency layers. Long empty-looking
 * lines hide blockers far from the head (six long-range links) and five arrows
 * are decoys.
 * Drafted with the level generator (seed 6304), reviewed for readability.
 */
export default levelFromMap(
  6,
  [
    'a< a  .  .  b< b  b  b',
    '.  c  c  c  .  .  .  .',
    '.  c  .  .  .  .  d  .',
    '.  cv .  .  d< d  d  .',
    'e  e  e  e> .  f  f> g^',
    '.  .  .  .  .  f  .  g',
    'h  h> i  i  i> .  k  .',
    '.  .  .  .  j< j  kv .',
  ],
  { revision: 3 },
);
