import { levelFromMap } from '../../levelMap';

/**
 * Level 4 — long-range blocking: two arrows are held by blockers three or
 * more cells away, and five dependency layers must be peeled in order. Still
 * three free moves, but five of the eight arrows start blocked.
 * Drafted with the level generator (seed 4304), reviewed for readability.
 */
export default levelFromMap(
  4,
  [
    'e  .  .  .  b  b  .',
    'e  .  a^ .  .  b  .',
    'e  .  a  .  .  bv c^',
    'e  d  d  d> .  .  c',
    'ev .  f^ .  g< g  c',
    'h< h  f  .  .  .  c',
    '.  .  f  f  .  .  .',
  ],
  { revision: 3 },
);
