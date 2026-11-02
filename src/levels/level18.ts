import { levelFromMap } from './levelMap';

/** Level 18 — chapter 1, normal level, generated from tools/level-plan.json (seed 1850, attempt 2), score 55 (Medium–hard). */
export default levelFromMap(
  18,
  [
    'a^ b< b  b  c< c  d  d  d  d>',
    'a  i  e^ b  e  c  d  f^ g  g',
    'a  i  e  e  e  h^ d  f  f  g',
    'a  iv j  j  h  h  d  d  f  g',
    'a  a  a  jv h  g< g  f  f  g',
    'k< k  k  m  m  m  g  g  g  g',
    'l  l  k  mv n  m  m  m  m  m',
    'k  l  k  n  n  u  u  u  u  u',
    'k  lv k  nv o  o  o> t  t  u',
    'k  k  k  r  o  p  p  p> t  u',
    'v  v  v  r  o  q  q> s  t  u',
    'v  w  vv rv o  o  s< s  tv uv',
    'v  w  w  w> x  x  x> y  y  y>',
  ],
  { revision: 4 },
);
