import { levelFromMap } from '../../levelMap';

/**
 * Level 8 — two free arrows and a ten-layer chain; ten blockers sit three
 * or more cells away from the arrows they hold.
 * Drafted with the level generator (seed 8302), reviewed for readability.
 */
export default levelFromMap(
  8,
  [
    'a  b  .  .  c  c  c  .',
    'av bv .  .  cv .  .  d^',
    'e  f  .  .  .  h  .  d',
    'ev f  f  f  f> h  .  .',
    '.  .  .  .  .  h  .  .',
    '.  .  g  g> .  hv i^ j^',
    '.  .  k^ .  .  m  i  j',
    'l  l> k  .  .  mv i  .',
  ],
  { revision: 3 },
);
