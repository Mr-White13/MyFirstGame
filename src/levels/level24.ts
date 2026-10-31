import { levelFromMap } from './levelMap';

/** Level 24 — generated from tools/level-plan.json (seed 2450, attempt 0), score 65 (Hard). */
export default levelFromMap(
  24,
  [
    'a  a  a> b  b  b> c^ d  d  d  d  d>',
    'e  e  e  e> f  f> c  d  g  g  g> h^',
    'f  f  f  f  f  i^ c  d  h  j  k  h',
    'l^ i  i  i  i  i  c  d  h  jv k  h',
    'l  v  v  v  c  c  c  d  h  k< k  h',
    'l  m  m> v  n^ p  p  p  h  h  h  h',
    'l  m  o^ v  n  pv n  p  q^ r  r  r',
    'l  m  o  v  n  n  n  p  q  r  x^ rv',
    's^ m  o  v  v  v  t^ u^ q  x  x  A',
    's  o  o  z  z  v  t  u  q  x  A  A',
    's  o  s  z  q  vv u  u  q  x  A  D',
    's  s  s  z  q  q  q  q  q  x  A  D',
    'B  y  y  z  w< w  w  w  x  x  A  D',
    'B  yv z< z  E  E  E  w  A< A  A  D',
    'Bv C< C  C  E  F  F  w  D< D  D  D',
    'E< E  E  E  E  Fv G< G  G  G  G  G',
  ],
  { revision: 3 },
);
