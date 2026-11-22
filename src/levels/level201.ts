import { levelFromMap } from './levelMap';

/** Level 201 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 20111, attempt 11), score 78 (Very hard). */
export default levelFromMap(
  201,
  [
    'c  U  U> c  c  c  c  c  c  h  V  V  V> h  h  h',
    'c  c  c  c  W^ X< X  X  c  h  h  h  h  h  a  h',
    'b< b  b  b  W  W  W  X  c  f  f  f  f  c^ a  h',
    'd^ e^ m  m  m  m  W  X  c  f  g  g  f  c  a  h',
    'd  e  m  n  n  m  W  X  c  fv gv f  f  c  a  hv',
    'd  e  m  n  m  m  W  X  c  c  c  c  c  c  av r',
    'd  e  m  n  m  i^ W  X  X  X  X  X  X  j^ r  r',
    'k^ e  m  n  m  i  W  W  W  W  W  W  X  j  r  B',
    'k  l^ mv nv m  i  o< o  p  p  p  p> X  j  r  B',
    'k  l  l  m  m  i  i  o  p  q  q  q> X  j  rv B',
    'k  k  l  m  o  o  o  o  p  q  s< s  X  j  A  B',
    't^ l  l  p  p  p  p  p  p  q  q  s  s  s  A  B',
    't  l  u< u  w  w  w  v< v  v  A  A  A  A  A  B',
    't  l  l  u  wv x  x> y  y> v  A  E  E  E  K  B',
    't  u  u  u  H  y  y  y  z^ v  A  A  A> E  K  Bv',
    'C  C  C  C> H  y  D  D> z  z  z  z  z  Ev K  K',
    'R  R  R  R  H  F< F  F  F  G< G  M  M  M  M  K',
    'R  O  O  O  Hv I  I  I  I  I> G  M  N  M  M  K',
    'R  O  P  O  L  L  L  L  J< J  G  M  N  M  M  Kv',
    'R  O  P  O  Lv Q  Q  S  S  J  G  Mv N  N  N> G',
    'R  Ov Pv O  Q< Q  S  S  J  J  G  G  G  G  G  G',
    'Rv S< S  S  S  S  S  J  J  T< T  T  T  T  T  T',
  ],
  { curls: true },
);
