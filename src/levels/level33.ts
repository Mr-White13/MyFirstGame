import { levelFromMap } from './levelMap';

/** Level 33 — chapter 2, normal level, generated from tools/level-plan.json (seed 3350, attempt 13), score 63 (Hard). */
export default levelFromMap(
  33,
  [
    'a< a  a  a  a  b< b  b  b  b  c< c',
    'd^ m  m  m  m  m  e< e  e  b  f^ c',
    'd  d  g< g  g  m  j  j  e  b  f  c',
    'h^ d  k  k  k  m  m  j  e  b  f  c',
    'h  d  i< i  k  p  m  j  j  j  j> c',
    'd  d  k< k  k  p  m  r  r  r  r  r',
    'd  l  l> o  o  p  mv w  q  q  q  r',
    'd  l  n  n> ov pv z  w  q  t  qv r',
    'd  l  v  v  v  v  z  w  q  t  x  rv',
    'd  v  v  s< s  v  z  w  t< t  x  E',
    'u< u  u  u  u  vv z  w  w  w> xv E',
    'y^ B  B  B  B  G  z  z  z  z> D  E',
    'y  A< A  A  Bv G  C  C  C  C  D  E',
    'y  y  y  A  H  G  Cv D< D  D  D  Ev',
    'F^ A  A  A  H  G  G  G> H  H  H  H>',
    'F  F  F  F  H  H  H  H  H  I< I  I',
  ],
  { revision: 2 },
);
