import { levelFromMap } from './levelMap';

/** Level 20 — chapter 1, very hard level, generated from tools/level-plan.json (seed 2050, attempt 30), score 68 (Hard). */
export default levelFromMap(
  20,
  [
    'a  a  a  a  a> c  c  c  b  b> c^',
    'k  k  k  k  e  c  d^ c  c  c  c',
    'k  h  e< e  e  c  d  d  d  d  d',
    'k  h  o  f< f  f  f  f  g< g  d',
    'k  hv o  i  i  i> j  j  j> g  d',
    'kv x  o  i  l  l  l  l  l  l> d',
    'x  x  o  i  l  m< m  m  m  d  d',
    'x  o  o  p  p  p  p  n^ m  d  t',
    'x  ov v  v  v  v  pv n  m  q^ t',
    'x  r< r  r  s^ v  n  n  m  q  tv',
    'x  x  u^ r  s  vv m  m  m  q  E',
    'A  x  u  r  s  w  w  w  w  w> E',
    'A  x  u  r  r  r  C  z  z  z  E',
    'A  xv y  y  y  y> C  z  D  zv E',
    'A  A  A> B  B  B> C  C> D  D> Ev',
  ],
  { revision: 4, tier: 'very hard' },
);
