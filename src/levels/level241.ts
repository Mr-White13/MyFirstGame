import { levelFromMap } from './levelMap';

/** Level 241 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 24105, attempt 10), score 77 (Very hard). */
export default levelFromMap(
  241,
  [
    'A< A  A  A  A  A  B< B  B  B  B  B  C< C  C  C  C',
    'F  D^ E< E  F^ A  G  G  G  G  G> B  L  L  L  H^ C',
    'F  D  J^ E  F  A  G  M  G  G  B  B  C  C  L  H  C',
    'F  D  J  E  F  A  G  M  G  G  B  I< I  C  L  H  C',
    'F  D  J  E  F  A  G  M  G  G  B  K^ I  C  L  L> C',
    'F  D  D  E  F  F  G  Mv G  G  B  K  I  C  C  C  C',
    'F  F  F  F  N^ F  G  G  G  G  B  K  I  O< O  O  O',
    'P< P  P  F  N  F  Q^ B  B  B  B  K  I  R  R  R> O',
    'S^ V  P  F  N  F  Q  B  W  I  I  I  I  R  T  T> U^',
    'S  Vv P  F  N  F  Q  W< W  I  Z  Z  Z  Z  T  .  U',
    'S  S  P  F  N  F  Q  X< X  I  Z  Z  Z  U  U  U  U',
    'Y^ S  P  F  F  F  Q  Q  X  I  Zv a  a  a  a> g  g',
    'Y  S  P  P  P  i  i  X  X  I  b  b  b  b> e^ f  g',
    'Y  l  l  t  P  i  c^ X  d^ I  I  e  e  e  e  fv g',
    'Y  l  h  t  P  i  c  X  d  g^ I  g  g  g  g  g  g',
    'Y  l  hv t  P  iv c  X  d  g  g  g  s  k  j  j> k^',
    'Y  lv t  t  P  u  c  X  d  m< m  n^ s  k  k  k  k',
    'Y  Y  t  P  P  u  c  X  X  X  m  n  s  s  s  s  s',
    'o^ Y  t  p  p> u  c  m  m  m  m  n  n  v  v  v  s',
    'o  Y  t  p  u  u  w  w  v  v  v  v  v  v  q^ v  s',
    'o  t  t  p  u  y  r^ w  v  x  q  q  q  q  q  v  s',
    'o  t  o  o  u  y  r  w  v  x  x  x  x  x  x  s< s',
    'o  t  t> o  uv y  r  w  vv w  w  w  w  w> x  x  x>',
    'o  o  o  o  y< y  r  w  w  w  z< z  z  z  z  z  z',
  ],
  { curls: true },
);
