import { levelFromMap } from './levelMap';

/** Level 238 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 23801, attempt 19), score 78 (Very hard). */
export default levelFromMap(
  238,
  [
    'v  u  u  u  u> v  v  v  v  v  v> w  w  w  w  w  w>',
    'v  v  v  v  v  v  K  C  C  C  w  w  x< x  x  x  x',
    'y^ K  K  K  K  K  K  C  w  C  w  z< z  z  z  z  x',
    'y  K  B  A< A  B^ C< C  w  w  w  H  E  E  E  E  x',
    'y  K  B  B  B  B  R  R  R  R  R  H  E  F  F  F  x',
    'y  K  R  R  R  R  R  D< D  c  c  H  Ev F  x  Fv x',
    'y  K  R  L  G  G  G  G  D  G^ c  H  H  H> x  x  x',
    'y  K  R  L  Q  Q  Q  G  G  G  c  I< I  I  I  I  J^',
    'y  Kv R  L  Q  L^ Q  c  c  c  c  M^ N< N  N  M  J',
    'y  R  R  L  Q  L  Q  c  h  h  h  M  M  M  M  M  J',
    'O^ R  P^ L  L  L  Qv c  h  i  h  T  T  T  T  T  J',
    'O  Rv P  S  S  S  S> c  h  i  h  T  d  d  d  Tv J',
    'O  O  P  b  g  g  g  c  h  i  h  T  d  a^ d  J  J',
    'f  O  P  b  b  b> g  cv h  i  h  T  dv a  a  J  e^',
    'fv O  P  g< g  g  g  h< h  iv h  T  l  n  a  J  e',
    'O  O  P  P  P  P  P  T  T  T  T  T  l  n  a  J  e',
    'O  j< j  j  j  j  P  T  k^ l< l  l  l  n  a  J  e',
    'O  m< m  m  m  j  P  T  k  k  k  k  n< n  a  J  J',
    'j  j  j  j  j  j  P  T  o  o  o  o  o  o  o> s  J',
    'j  r  r  r  r  r  P  T  o  o  s  s  s  s  s  s  J',
    'j  r  P  P  P  P  P  T  p  p> s  q  q  q  q  q> J',
    'j  rv P  s< s  s  s  s  p  p  s  J  J  J  J  J  J',
    'j  j  P  P  P  P  P  s  s  s  s  J  t< t  t  t  t',
  ],
  { curls: true },
);
