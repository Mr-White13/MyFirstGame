import { levelFromMap } from './levelMap';

/**
 * Level 7 — fewer arrows than level 6 but harder: nine L-hooks and an
 * eleven-step chain where almost every step leaves a single arrow that can
 * escape. Difficulty here comes from structure, not size.
 * Drafted with the level generator (seed 700), reviewed for readability.
 */
export default levelFromMap(
  7,
  [
    '.  a  a> d  .  .  .  .',
    '.  .  .  d  .  .  .  f',
    'b^ .  .  d  e  e  .  f',
    'b  c^ g  dv ev f< f  f',
    'b  c  g  g> h  .  .  .',
    'b  .  k  h< h  i^ .  .',
    'b  j^ kv .  .  i  i  i',
    'j  j  .  .  l< l  l  .',
  ],
  { revision: 2 },
);
