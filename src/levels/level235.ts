import { levelFromMap } from './levelMap';

/** Level 235 — chapter 12, one-life level (normal board, a single heart), full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 23501, attempt 19), score 78 (Very hard). */
export default levelFromMap(
  235,
  [
    'C  C  C  C  C  C  z< z  z  A< A  A  A  A  A  K  A',
    'B< B  B  C< C  C  H  H  z  z  z  z  z  z  A  K  A',
    'D< D  B  E^ F< F  E  H  z  z  J  G^ H^ z  A  K  A',
    'I^ D  B  E  E  E  E  H  z  z  Jv G  H  z  A  K  A',
    'I  D  B  O  O  M  M  H  H  H  H  H  H  z  A  Kv A',
    'I  D  B  O  O  L^ M  M  M  M  M  M> N^ z  A  A  A',
    'I  I  O  O  Ov L  L  L  P< P  P  N  N  z  Y  Y  Y',
    'I  I  Q< Q  S  S  S  S  S  S  P  N  V  V  V  V  Y',
    'I  Q  R^ Q  Sv b  b  b  b  b  b  N  V  T< T  V  Y',
    'I  Q  R  Q  Q  b  U  U  U  U> b  N  V  V  T  V  Y',
    'I  Q  R  R  Q  b  U  X  X  b  b  N  f  V  T  Vv Y',
    'I  Q  Q  Q  Q  b  U  X  W  b  e  N  f  V  T  Y  Y',
    'I  I  I  I  I  b  W^ Xv W  b  e  Y^ f  V  T  Y  a^',
    'b  b  b  b  b  b  W  W  W  bv e  Y  f  V  T  Y  a',
    'c  c  c  c  c> n  d  d  d  d> ev Y  fv V  V  Y  a',
    'u  g< g  g  g  n  h  h  h  h  h  Y  Y  Y  Y  Y  a',
    'u  u  q  q  g  n  hv i  i  i> p  p  p  j  j  j> k^',
    'w  u  q  g  g  n  i  i  m  s  s  s  p  j  l< l  k',
    'w  u  q  n  n  n  m< m  m  s  p  p  p  j  t  l  k',
    'w  u  q  nv o  o  o  o> r  s  pv t  t  t  t  l  k',
    'w  u  qv v  v  v  r< r  r  sv t< t  l  l  l  l  k',
    'w  u  u> v  v  v  v  v  v> y  y  y  k  k  k  k  k',
    'w  w  w  w  w  w> x  x  x  x  x> y  y  y  y  y  y>',
  ],
  { lives: 1, curls: true },
);
