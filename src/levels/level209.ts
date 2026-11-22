import { levelFromMap } from './levelMap';

/** Level 209 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 20921, attempt 18), score 76 (Very hard). */
export default levelFromMap(209, [
  'W  W  W  W  W  W  W> h  h  h  h  h  h  X  X> a^',
  'b^ c  c  c  c> h  h  h  k  k  k  k  h  X  a  a',
  'b  c  d  d> l  e  e> k  k  f  f  k  h  X  X  f^',
  'b  c  d  g^ l  e  x  x  x  x  f  k  h  h> X  f',
  'b  i^ d  g  l  e  x  j< j  x  f  k  k> X  X  f',
  'b  i  i  i  lv x  x  q^ j  x  f  f  f  f  f  f',
  'b  b  b  i  i  x  m^ q  j  x  n^ o  o  o> H  H',
  'p^ v  v  v  v  x  m  q  j  x  n  o  r< r  s^ H',
  'p  v  t  t> v  x  m  j  j  n  n  u  u> r  s  H',
  'p  p  v< v  v  x  m  j  V  V  V  u  r  r  s  H',
  'w^ p  x< x  x  x  m  m  y< y  V  u  s  s  s  H',
  'w  p  z  z> C  C  C  C  C  y  V  H  H  H  H  H',
  'w  p  z  A^ C  B  B> y  Cv y  V  H  F  F  F  D^',
  'w  p  z  A  C  B  I  y  y  y  V  H  F  Q  E^ D',
  'w  p  z  z  C  B  I  K  K  V  V  H  Fv Q  E  D',
  'w  w  w  w  C  B  I  K  M  V  G^ H  G  Q  E  D',
  'C  C  C  C  C  I  I  K  M  V  G  Hv G  Q  E  D',
  'C  I< I  J  J> I  N  Kv M  V  G  G  G  Q  P  P',
  'C  L^ I  I  I  I  N  U  Mv V  V  Q  Q  Q  O  P',
  'C  L  L  N< N  N  N  U  U  U  V  Q  O< O  O  Pv',
  'C  T  L  T  T  T  T  T  .  U  V  Qv R< R  R  R',
  'C  T  T  T  S< S  S  T  T> Uv V  V  V  V  V  V>',
]);
