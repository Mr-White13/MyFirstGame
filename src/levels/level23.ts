import { levelFromMap } from './levelMap';

/** Level 23 — chapter 2, hard level, generated from tools/level-plan.json (seed 2350, attempt 3), score 68 (Hard). */
export default levelFromMap(
  23,
  [
    'a  a  a  a  a> b  b  b  b  b> c^',
    'a  b  b  b  b  b  f  f  f  d^ c',
    'a  e^ f  f  f  f  f  d  f  d  c',
    'a  e  fv i  g^ h< h  d  d  d  c',
    'e  e  p  i  g  n  h  h  h  c  c',
    'p  p  p  iv g  n  n  l  l  c  j^',
    'p  k< k  m  g  g  n  n  lv c  j',
    'p  t  k  m  m> g  u  nv o  c  j',
    'p  t  k  g  g  g  u  o< o  c  j',
    'pv t  k  g  q^ u  u  j  j  j  j',
    't  t  k  q  q  u  r^ w  w  w  w',
    't  u  u  u  u  u  r  w  s< s  s',
    'tv uv A  A  A  A  r  w  x  y  y',
    'v  v  v  v  v> A  A  wv x  x> yv',
    'v  z  z  z  z  z> A  A  A  A  A>',
  ],
  { revision: 4, tier: 'hard' },
);
