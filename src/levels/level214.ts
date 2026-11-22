import { levelFromMap } from './levelMap';

/** Level 214 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 21407, attempt 11), score 78 (Very hard). */
export default levelFromMap(214, [
  'U< U  U  V^ W< W  X< X  X  X  f  f  f  s  s  s',
  'W  W  U  V  V  W  a^ b^ c< c  f  g  f  f  f  s',
  'd^ W  W  W  W  W  a  b  e^ c  fv g  g  g> f  s',
  'd  d  d  d  d  d  a  b  e  c  a  f  f  f  f  s',
  'h^ i< i  i  i  d  a  a  a  a  a  f  s  s  s  s',
  'h  h  j< j  i  d  k< k  k  k  o  f  s  q  q  q',
  'l  h  i  i  i  n  n  n  n  l^ o  f  s  t  p  q',
  'l  h  h  h  h  n  m< m  n  l  o  f  s  t  p  q',
  'l  l  n< n  n  n  l  l  l  l  o  o> s  t  pv qv',
  'r^ l  l  l  l  l  l  s< s  s  s  s  s  t  t> z',
  'r  H  H  H  H  H  H  y  y  u< u  u  u  u  u  z',
  'r  H  v^ B  B  B  H  y  C  w^ x< x  x  x  u  z',
  'r  H  v  A  A  B  H  yv C  w  w  w  w  w  w  zv',
  'r  H  v  Av B< B  H  C< C  M  M  M  M  M  M  M',
  'r  r  v  v  H  H  H  M  M  M  I< I  G  G  G  M',
  'D^ r  r  r  H  K  r  M  E^ F^ L  I  Gv N  G  M',
  'D  D  D  r  Hv K  r  M  E  F  L  I  F  N  N  N',
  'J^ P  D  r  K< K  r  M  E  F  L  L> F  O  O  N',
  'J  P  D  r  r  r  r  Mv E  F  F  F  F  O  N< N',
  'J  P  D  D  D  D  D  D  E  E  E  E  E  O  O> E',
  'J  Pv Q< Q  Q  Q  Q  Q  R  R  R  T  E  E  E  E',
  'J  J  J  R< R  R  R  R  R  S< S  T  T  T  T  T>',
]);
