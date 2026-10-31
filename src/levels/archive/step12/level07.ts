import { levelFromMap } from '../../levelMap';

/**
 * Level 7 — same arrow count as level 6 but deeper: only two arrows are
 * free at the start and the top row is a three-arrow queue (c waits for b,
 * which waits for a). Eight dependency layers.
 * Drafted with the level generator (seed 7307), reviewed for readability.
 */
export default levelFromMap(
  7,
  [
    'a< a  b< b  c< c  .  .',
    '.  d^ .  .  .  e  .  .',
    'f  d  .  g  e< e  .  .',
    'f  d  .  g  .  .  .  .',
    'fv d  g< g  .  h^ .  .',
    '.  .  .  .  .  h  .  i^',
    '.  j^ .  .  .  h  .  i',
    'j  j  k  k> .  h  h  i',
  ],
  { revision: 3 },
);
