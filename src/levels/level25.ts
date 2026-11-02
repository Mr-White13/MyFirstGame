import { levelFromMap } from './levelMap';

/** Level 25 — chapter 2, normal level, generated from tools/level-plan.json (seed 2550, attempt 0), score 61 (Hard). */
export default levelFromMap(
  25,
  [
    'a^ g  d  d  d  d  d  b< b  b',
    'a  g  d  c  c  c  d  d  d> j',
    'a  g  d  d  d  c  e  f  f  j',
    'a  g  g  i  c< c  e  e  fv j',
    'a  a  gv i  o  o  o  e  e> j',
    'h^ a  i< i  o  j< j  j  j  j',
    'h  a  a  o  o  p  n  n  n  k',
    'h  q  a  o  l^ p  m< m  nv k',
    'h  q  q  ov l  pv k  k  k  k',
    'h  h  qv s  l  u  kv x  x  x',
    'r^ h  s< s  l  u  u  x  y  x',
    'r  h  w  t  t  t  u  x  y  x',
    'r  r  w  tv u< u  u  x  y  x',
    'v  v> w  w  w  w  w> x  yv xv',
  ],
  { revision: 4 },
);
