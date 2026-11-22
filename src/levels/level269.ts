import { levelFromMap } from './levelMap';

/** Level 269 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 26905, attempt 15), score 78 (Very hard). */
export default levelFromMap(
  269,
  [
    'w< w  w  w  w  w  y  w  w  w  w  w  w  D  x< x  x  x',
    'A  A  A  J  J  w  yv w  J  J  J  J  w  D  D  D  z^ x',
    'Av f  f  J  J  w  w  w  J  B< B  B  B  B  B  D  z  x',
    'f  f  f  J  J  J  J  J  J  K  C^ D< D  D  B  D  x  x',
    'f  f  f  J  J  J  J  J  J  K  C  E< E  D  D  D  F^ E',
    'f  f  f  f  f  Q  J  J  J  K  C  N  E  H  H  H  F  E',
    'f  G^ I  n  f  Q  J  J  J  K  C  N  E  H  H> F  F  E',
    'f  G  Iv n  f  Q  Jv J  J  K  C  N  E  E  E  E  E  E',
    'f  G  n  n  f  Q  K< K  K  K  C  N  N  N  O  P  P  P',
    'f  G  n  S  f  Q  M  L< L  L  L  L  L  N  O  P  d  P',
    'f  G  n  S  Q  Q  M  M  M  M> c  c  V  Nv O  P  d  P',
    'f  G  n  S  Q  U  U  U  U  U  c  V  V  O< O  P  d  Pv',
    'f  G  n  S  Q  Q> R  R  R  U  c  V  a  a  a  a  d  d',
    'f  n  n  S  S  R< R  T  R  U  c  V  a  e  e  e  e  d',
    'f  n  p  p  S  S  S> T  T> Uv c  Vv a  a  a  a> e  d',
    'f  n  p  b< b  b  b  b  b  b  cv d< d  d  d  d  e  d',
    'f  n  p  p  p  p  i  i  i  b  b  b  b  b  b  d  ev d',
    'fv n  n  n  n  p  i  j  j  o  o  g  g  g> s  d  d  d',
    'm  m  m  m  n  p  i  j  o  o  o  g  h  h> s  s  s  s',
    't  t  t  m  n  p  iv jv o  o  o  g  g  g  g  g  g  s',
    't  q  t  m  n  p  k< k  k  o  o  o  o  o  o  l^ g  s',
    't  q  m< m  nv p  p  p  k  k  k  o< o  o  o  l  g  s',
    't  q  v  v  v  v  v  p  p  p  p  p  p  p  p  p  p> s',
    't  qv v  r< r  r  r  v  v  v  v  v  v  s< s  s  s  s',
    't  t> v  v  v  v  v  v  u  u  u  u> v  v  v  v  v  v>',
  ],
  { curls: true },
);
