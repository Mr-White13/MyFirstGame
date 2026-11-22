import { levelFromMap } from './levelMap';

/** Level 165 — chapter 9, one-life level (normal board, a single heart), long arrows, generated from tools/level-plan.json (seed 16552, attempt 3), score 74 (Very hard). */
export default levelFromMap(
  165,
  [
    'g  g  g  g  g  g  j  j  j  b  b  b  h  h  h',
    'a^ m  m  m  m  g  j  b< b  b  e  b  h  b  h',
    'a  c  c> d^ m  g  j  e^ f  e  e  b  b  b  h',
    'a  c  d  d  m  g  j  e  fv e  g  g  g  g> hv',
    'a  c  d  i^ m  g  jv e  e  e  g  r  r  r  r',
    'a  c  d  i  m  g  g  g  g  g  g  r  C  C  r',
    'a  a  d  i  m  m  k< k  k  k  k  r  C  p  r',
    'l^ a  d  i  i  mv q  r  r  r  r  r  C  p  r',
    'l  a  d  n  n  n  q  r  o  o  o  o  C  p  p',
    'l  a  n  n  u  nv q  r  o  s  s  ov C  C  pv',
    'l  a  u  u  u  q< q  rv o  t  s  s  s> C  C',
    'l  a  u  z  z  A  A  A  A  t  t  t  t  t> C',
    'l  a  u  u> z  A  v  v> A  A  A  A  A  A  C',
    'l  a  z  z  z  A  v  w  w  w  w  w  w> A  C',
    'l  l  z  x^ F  A  v  w  y  y  y  y  y> A  C',
    'z^ l  z  x  F  Av v  w  y  B< B  B  B  A  Cv',
    'z  l  z  x  F  H  v  w  w  w  w  D  D  D  D',
    'z  z  z  x  F  H  v  v  v  v  v  Dv E  E> D',
    'x  x  x  x  Fv H  G  G  G  G> v  I  E  D  D',
    'H< H  H  H  H  H  I< I  I  I  I  I  E  E  E',
  ],
  { lives: 1 },
);
