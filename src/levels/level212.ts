import { levelFromMap } from './levelMap';

/** Level 212 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 21210, attempt 22), score 78 (Very hard). */
export default levelFromMap(
  212,
  [
    'S  S> g  g  g  g  g  U  U  U  V  V  V  V  V  V',
    'S  b  g  T  T  T  g  g  a  Uv Vv W  W> e  e  f',
    'S  b  g  T  d  X< X  g  a  a  a> W  W  W  e  f',
    'b^ b  g  T  d  c^ X  g  d^ i  i  i  i  W  e  f',
    'b  b  g  Tv d  c  X  g  d  i  j  j  i  W  ev f',
    'g  g  g  d  d  X  X  g  d  i  j  i  i  W  m  fv',
    'h  h  h  d  g< g  g  g  d  i  j  i  W  W  m  m',
    'hv h  h  d  d  d  d  d  d  i  j  i  k  k  k  m',
    'L  L  q  p  p  p  i< i  i  i  jv k< k  l  k  m',
    'L  q  q  p  r  p  p  p  p  p  l< l  l  l  k  mv',
    'L  q  p< p  r  s  s  s  s  p  n< n  n  n  n  w',
    'L  q  r  r  r  s  o< o  o  p  p  p  p  p  p  w',
    'L  qv rv G  t  s  s  s  s> u  u  u  w  w  w  w',
    'L  L  L  G  t  t  t  t  t> u  v  uv w  z  z  z',
    'x  y  L  G  B  v< v  u  u  u  v  A  wv R  R  z',
    'xv yv L  G  B  E  v  v  v  v  v  A  D  R  z< z',
    'L  L  L  G  B  E  N  N  N  A< A  A  D  R  R  R',
    'L  I  G  G  Bv E  N  C< C  C  C  D< D  P  K  R',
    'L  I  G  E< E  E  N  N  F  F  F  F> P  P  K  R',
    'L  I  G  G> H  H  H> N  F  J  J  J  P  K  K  R',
    'L  Iv H  H  H  M  N  N  J  J  O  Jv P  Kv Q  R',
    'Lv M< M  M  M  M  Nv O< O  O  O  P< P  Q< Q  Rv',
  ],
  { curls: true },
);
