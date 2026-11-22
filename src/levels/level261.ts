import { levelFromMap } from './levelMap';

/** Level 261 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 26142, attempt 15), score 76 (Very hard). */
export default levelFromMap(
  261,
  [
    'y^ z< z  z  z  y  y  A  A> L  L  L  L  L  L  C  C  C',
    'y  y  y  y  y  y  B  A  B^ L  M  M  M  M  L  C  G  Cv',
    'L  L  L  L  L  L  B  B  B  L  M  M  M  M  L  C  G  M',
    'L  D^ E^ D  D  L  L  L  L  L  M  M  M  M  L  L  G  M',
    'L  D  E  D  F^ M  M  M  M  M  M  I  J  M  G< G  G  M',
    'L  D  E  D  F  M  K  P  H^ I< I  I  Jv M  M  M  M  M',
    'L  D  E  D  F  M  Kv P  H  H  H  H  T  T  T  T  T  T',
    'Lv D  E  D  F  Mv P  P  N< N  N  H  T  O< O  O  O  T',
    'U  D  D  D  F  P< P  H  H  H  H  H  T  Q  Q  Q> O  T',
    'U  U  U  U  U  U  S  S  S  S  S  S  T  O  O  O  O  T',
    'i  i  i  i  i  U  S  R< R  R  R  Sv T  W  W  W  W  Tv',
    'i  g  g  g  i  U  S  S  S  S  S  T  T  W  e  e  e  e',
    'i  g  f  g  i  Uv V< V  V  V  V  T  j  W  e  d  d  e',
    'i  g  f  g  i  i  i  j  j  j  j  j  j  W  e  b  d  e',
    'i  g  f  g  g  g  g  j  W< W  W  W  W  W  e  b  d  e',
    'i  i  f  f  f  f  g  j  X  X  X  X  X> a^ e  bv d  e',
    'o  i  c< c  c  f  g  j  X  a  a  a  a  a  e  e  dv ev',
    'o  i  f< f  f  f  gv j  h^ a  h  v  v  v  v  v  v  v',
    'o  iv j< j  j  j  j  j  h  h  h  v  l  k^ m  m  m  x',
    'o  o  o  o  o  o  v  v  v  v  v  v  l  k  m  k  m  x',
    'r  r  r  r  r  o  v  l  l  l  l  l  l  k  k  k  m  x',
    'r  n  n  n  r  o  v  lv q  q  q  q  m< m  m  m  m  x',
    'r  nv r  n  r  ov v  v  q  p< p  q  q  q  q  q  q> x',
    'r  r  r  n  rv u  u  v  s  s> p  t  t  t> x  x  x  x',
    'u< u  u  u  u  u  v< v  s  p  p  t  w< w  x  x  x  x>',
  ],
  { curls: true },
);
