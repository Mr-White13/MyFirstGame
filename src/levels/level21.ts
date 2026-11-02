import { levelFromMap } from './levelMap';

/** Level 21 — chapter 2, normal level, generated from tools/level-plan.json (seed 2150, attempt 2), score 59 (Hard). */
export default levelFromMap(
  21,
  [
    'a^ b  b> c  c> d  d  d  d  d>',
    'a  b  e^ c  d  d  f  f  f  f',
    'a  b  e  c  f< f  f  g  g> f',
    'a  b  b  h< h  h  i^ g  o^ f',
    'a  a  a  a  a  h  i  g  o  j^',
    'k^ l^ m< m  a  n^ i  g  o  j',
    'k  l  q^ m  a  n  p^ g  g  j',
    'l  l  q  q  a  n  p  p  g  j',
    'r  r  r  r  a  u< u  j  j  j',
    'rv s  y  t< t  x^ u  u  u  v^',
    'B  s  y  w^ t  x  x  x  A^ v',
    'B  s  yv w  w  w  z  z  A  v',
    'B  sv C  C  C  v  zv A  A  v',
    'Bv C< C  D< D  v  v  v  v  v',
  ],
  { revision: 4 },
);
