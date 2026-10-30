import { levelFromMap } from './levelMap';

/**
 * Level 8 — only two arrows can move at the start; two interlocking L-shapes
 * (e and h) sit in the middle of an eleven-step chain.
 * Drafted with the level generator (seed 210), reviewed for readability.
 */
export default levelFromMap(
  8,
  [
    '.  c  .  a< a  .  .  b^',
    '.  cv d  d> .  e  .  b',
    'f  g  e< e  e  e  h  .',
    'fv gv .  .  h< h  h  j',
    'k  k  .  i^ .  .  .  jv',
    'kv .  l^ i  m< m  n< n',
    '.  .  l  o< o  o  .  r',
    'p  p  p  p> q  q> .  rv',
  ],
  { revision: 2 },
);
