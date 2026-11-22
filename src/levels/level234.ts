import { levelFromMap } from './levelMap';

/** Level 234 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 23433, attempt 13), score 77 (Very hard). */
export default levelFromMap(
  234,
  [
    'c  A< A  A  A  E  G  G  G  G  G  B  B> C  C  C  C>',
    'c  H  H  H  A  E  G  F  F  F  G  B  D  C  D  D> E^',
    'c  H  A  H  A  E  G  F  F> B  B  B  D  D  D  M^ E',
    'c  H  A  A  A  E  G  G  G> E  E  E  E  E  E  M  E',
    'c  H  H  H  H> E  E  E  E  E  L  L  L  I^ E  M  E',
    'c  c  c  J< J  J  J  J  J  K  K  K> Lv I  E  M  E',
    'N  N> c  c  O  O> P  P> J  K  S  I  I  I  E  E  E',
    'N  Q< Q  c  O  R^ P  R  J  K  Sv I  T  T  T  T  T>',
    'N  U^ Q  c  O  R  R  R  J  K  K  I  T  V^ W  W> V',
    'N  U  Q  c  X< X  a  a  a  a  K  I  T  V  V  V  V',
    'N  U  U  c  c  X  e  e  Y^ a  K  I  T  T  Z^ T  T',
    'N  N  N  N  c  X  e  Y  Y  av K  f  f  T  Z  h  T',
    'b  b  b> N  c  X  e  e  e  e  e  e  f  T  Z  h  T',
    'N  N  N  N  c  c> d  d  d  d  d> ev fv T  Z  h  T',
    'n  n  n  j  g< g  g  g  g  g  g  g  g  T  Z  hv T',
    'n  i^ n  j  j  j  j> k  k  k  k  k  k> T  T  T  T',
    'n  i  n  k  k  k  k  k  l< l  s  s  s  s  s  s  m^',
    'i  i  n  n  n> s  s  s  s  s  s  o  o  o  o> s  m',
    'i  p^ w  w  w  s  t  t  t> q  q> r  r  r  r> sv m',
    'i  p  w  p  w  s  t  t  q  q  v  v  v  v  v  v  m',
    'i  p  p  p  w  s  z  z  z  z  z  z  u  u  u> v  v^',
    'i  i  i  i  wv s  z  x  x  x  x> z  u  y  y> v  v',
    's  s  s  s  s  s  zv x  z  z  z  z  u  u  u  v  v',
  ],
  { curls: true },
);
