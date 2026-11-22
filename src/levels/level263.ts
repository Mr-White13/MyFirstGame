import { levelFromMap } from './levelMap';

/** Level 263 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 26306, attempt 17), score 78 (Very hard). */
export default levelFromMap(
  263,
  [
    'y^ z^ J  z  z  z  z  z  z  D  D  D  F  F  F  F  F  F',
    'y  z  J  z  B  A^ B^ C^ z  Dv F  F  F  E  E  E> H  F',
    'y  z  J  z  B  A  B  C  z  F< F  G^ H< H  H  H  H  F',
    'y  z  J  z  B  B  B  C  z  z  z  G  I< I  I  I  I  I',
    'y  z  Jv z  M  M  M  C  C  C  z  G  N  N  K^ L^ R  I',
    'M^ z  z  z  M  a  M  M  M  C  z  G  N  K  K  L  R  I',
    'M  M  M  M  M  a  a  a  M  C  z  G  N  N> L  L  R  I',
    'O^ P< P  P  P  P  Q^ a  M  C  C  C  R< R  R  R  R  I',
    'O  Q  Q  Q  Q  Q  Q  a  X  X  X  C  S^ T  T> U^ V^ I',
    'O  Q  a  a  a  a  a  a  W< W  Xv C  S  T  b  U  V  V',
    'O  a< a  n  n  n  n  n  n  W  e  C  S  T  b  U  f  V',
    'O  n  n  n  c  c  c  c  n  W  e  C  S  b< b  U  f  V',
    'O  c< c  d  d  d  d> c  n  W  e  C  C  C  C  U  f  V',
    'O  O  c  c  c  c  c  c  n  W  ev U  U  U  U  U  fv V',
    'g^ O  l  l  l  l  l  l  n  W  W  U  V  V  V  V  V  V',
    'g  O  O  O  O  O  O  l  n  n  W  U  V  h^ o  m  m  m',
    'g  k  k  k  k  i^ O  l  j^ n  W  U  V  h  o  m  p  m',
    'g  kv k  k  i  i  O  l  j  n  W  U  V  h  o  m  p  m',
    'g  g  g  g  g  g  O  lv j  n  W  U  V  h  o  mv p  m',
    'v  v  v  v  v  v  O  n< n  n  W  W  W  h  ov p< p  m',
    'v  v  v  v  v  v  O  O  O  O  O  O  W  h  h  h  h  h',
    'v  v  v  v  v  q< q  q  q  q  q  O  W  r^ s  r  r  r',
    'v  w  w  w  v  v  x  x  x  x  x  O  W  r  s  s  s> r',
    'v  w  t< t  v  v  x  u< u  u  u  O  W  r  r  r  r  r',
    'vv w  w  w> v  v  x  x  x  x  x> O  W  W  W  W  W  W',
  ],
  { curls: true },
);
