import { levelFromMap } from './levelMap';

/** Level 231 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 23100, attempt 27), score 78 (Very hard). */
export default levelFromMap(
  231,
  [
    'q^ r  w  w  w  q  q  q  q  q  q  s  s  s  s  s  x',
    'q  r  w  r^ w  q  s^ t  t  t> q  s  v  v  v  s  x',
    'q  r  w  r  w  q  s  s  q  q  q  s  v  u  v  s  x',
    'q  r  w  r  w  q  Q  s  s  s  s  s  vv uv v  s  x',
    'q  r  r  r  wv q  Q  H  H  H  x< x  s  s  s  s  x',
    'q  q  q  q  q  q  Q  H  y^ H  H  x  x  x  x  x  x',
    'A  A  A  A  A  G  Q  H  y  y  y  y  C  C  C  C  E',
    'z^ K  K  K  Av G  Q  H  C  C  C  C  C  B< B  C  E',
    'z  F  F  K  K  G  Q  H  Cv D  D  D  D  D> B  C  E',
    'z  F  I  L  K  G  Q  H  H  H  B  B  B  B  B  C  E',
    'z  F  I  L  K  G  Q  Q  Q  H  B  E< E  E  E  E  E',
    'z  Fv I  L  K  G  G> M  Q  H  H> Q  Q  Q  Q  Q  Q',
    'z  I< I  L  K  M  M  M  Q  Q  Q  Q  J< J  b  b  Q',
    'T  T  T  L  Kv M  S^ P  P  P  P  P  P  J  b  c  Q',
    'T  L< L  L  M< M  S  S  f  f  f  f  P  J  b  c  Q',
    'T  T  R  O  N< N  O^ S  f  J  P< P  P  J  b  c  Q',
    '.  T  R  O  O  O  O  S  f  J  J  J  J  J  b  c  Qv',
    'T  T  R  R  R  R  R> S  f  b  b  b  b  b  b  c  m',
    'Tv U< U  U  U  a< a  a  f  bv g  g  g  g  c< c  m',
    'j  j  d< d  U  e< e  a  fv g< g  h< h  h  h  h  m',
    'j  d  d  d  k  k  e  a  i< i  i  i  i  i  i  h  m',
    'jv d  d  d  k  e  e  a  a  k  k  k> p  l  l  l> mv',
    'n  n  n  n> k  k  k  k  k  k  o  o> p  p  p  p  p>',
  ],
  { curls: true },
);
