import { levelFromMap } from './levelMap';

/** Level 19 — chapter 1, normal level, generated from tools/level-plan.json (seed 1950, attempt 0), score 58 (Hard). */
export default levelFromMap(
  19,
  [
    'a  a  a> b  b  b> c  c  c  c>',
    'e  d< d  d  e^ f^ c  g^ h< h',
    'e  e  e  e  e  f  c  g  k^ h',
    'p  p  i^ f  f  f  j^ g  k  k',
    'p  i  i  f  j  j  j  g  l  m^',
    'p  i  f  f  j  n  o  o  l  m',
    'p  i  i  i  i  n  n  o  lv m',
    'pv u  r  r  i  i  n  o  o> m',
    'w  u  r  q  r  r> n  n  n  s^',
    'w  u  r  qv r  t  t  t  nv s',
    'w  u  r  r  r  x  x  tv s  s',
    'w  u  u  u  u> x  y  v  v  v>',
    'wv x< x  x  x  x  y  y  y  y>',
  ],
  { revision: 4 },
);
