import { levelFromMap } from './levelMap';

/**
 * Level 5 — a tight board: only three arrows are free at the start and most
 * steps offer one or two moves, so a quick visual sweep no longer works.
 * Drafted with the level generator (seed 308), reviewed for readability.
 */
export default levelFromMap(
  5,
  [
    '.  c  c  g  a^ .  .',
    'b^ c  .  g  a  .  d',
    'b  cv .  g  a  .  dv',
    'e^ f< f  gv h< h  .',
    'e  .  i^ .  .  .  k',
    'e  .  i  j< j  j  k',
    'e  .  i  i  .  .  kv',
  ],
  { revision: 2 },
);
