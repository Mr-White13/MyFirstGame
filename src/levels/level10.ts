import { levelFromMap } from './levelMap';

/**
 * Level 10 — the first major challenge: a single free arrow at the start and
 * a fifteen-step chain. Long horizontal arrows keep it readable despite
 * twenty-three arrows.
 * Drafted with the level generator (seed 212), reviewed for readability.
 */
export default levelFromMap(
  10,
  [
    'a  a  a> b  b  b  b  b> f',
    'c^ d  d  d  d> .  e^ .  fv',
    'c  g  g  g  g> .  e  h^ .',
    'c  i^ .  j< j  j  j  h  .',
    'c  i  n  k^ l< l  m< m  p',
    '.  .  nv k  .  l  .  o^ pv',
    'q  q> .  r  r> l  l  o  w',
    'q  t  .  r  s< s  s  .  w',
    '.  t  t> u  u> v  v> .  wv',
  ],
  { revision: 2 },
);
