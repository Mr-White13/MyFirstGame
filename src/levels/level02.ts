import { levelFromMap } from './levelMap';

/**
 * Level 2 — straight arrows and the first real dependency: a waits for b,
 * which waits for d, and e waits for c. Three moves are free, but only one of
 * them starts the long chain.
 * Drafted with the level generator (seed 2301), reviewed for readability.
 */
export default levelFromMap(
  2,
  [
    '.  .  .  .  b  .  .',
    'a  a  a> .  b  .  .',
    '.  .  .  .  bv .  c^',
    '.  .  .  .  .  .  c',
    '.  .  d< d  d  d  e^',
    '.  f  .  .  .  .  e',
    '.  fv .  .  .  .  e',
  ],
  { revision: 3 },
);
