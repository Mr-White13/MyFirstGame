import { levelFromMap } from './levelMap';

/** Level 26 — generated from tools/level-plan.json (seed 2650, attempt 1), score 67 (Hard). */
export default levelFromMap(
  26,
  [
    'a  a  a  a  a  b< b  b  b  b  c  c>',
    'k  k  k  k  av d< d  n  n  n  c  e^',
    'k  h  h  f< f  f  d  g  g  n  c  e',
    'k  h  o  o  o  o  d  d  gv n  c  c',
    'k  h  h  h> m  o  i  i  i> n  j^ c',
    'k  k  k> m  m  o  n  n  n  n  j  c',
    'p  l< l  mv s  o  nv o  o> j  j  c',
    'p  q  l  r  s  o  o  o  y  j  c  c',
    'pv qv r< r  s  t  t  y  y  j  j  j',
    's< s  s  s  s  tv E  y  z  z  u^ j',
    'v  v  v  v> E  E  E  y  z  u  u  w^',
    'x< x  E  E  E  H  A  y  z  u  w  w',
    'D  x  E  F  G  H  A  yv zv u  w  C^',
    'D  x  E  F  G  H  A  A  A> u  B^ C',
    'D  x  E  F  G  H  u  u  u  u  B  C',
    'Dv x  Ev Fv Gv H  H  H  H  H> B  B',
  ],
  { revision: 3 },
);
