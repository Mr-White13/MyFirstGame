import { levelFromMap } from './levelMap';

/** Level 248 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 24833, attempt 17), score 77 (Very hard). */
export default levelFromMap(
  248,
  [
    'q^ r^ z  z  u  u  u  u  u  u  s< s  s  s  s  s  s',
    'q  r  t^ z  u  v  v  v  v  u  u  u> v  v  v  v  v>',
    'q  r  t  z  u  v  w< w  w  v  v  v  v  x< x  x  x',
    'q  r  t  z  u  v  v  v  v  v  y  y  y  y  y  y> x',
    'q  r  z< z  u  u  u  u  u  u  u  u  u  H  A^ x  x',
    'B^ r  r  r  r  C^ D  D  D  D  D  D> E^ H  A  A  A',
    'B  F< F  F  r  C  D  L  L  L  E  E  E  H  G^ H^ A',
    'B  r  r  F  r  C  D  L  I  I  E  A  H  H  G  H  A',
    'B  r  F  F  r  C  D  L  I  M  E  A  H  G  G  H  A',
    'B  r  r  r  r  C  D  L  I  M  E  A  H  H  H  H  A',
    'B  B  D  D  D  D  D  L  Iv M  E  A  A  A  A  A  A',
    'J^ B  D  K< K  K  K  L  L> Mv E  E  E  E  E  E  Q',
    'J  B  D  N^ O< O  O  O  O  O  P< P  P  P  O  E  Qv',
    'J  R^ D  N  N  S^ T< T  T  O  O  O  O  O  O  E  E',
    'J  R  U< U  N  S  V< V  T  T  T  W< W  W  W  X^ E',
    'J  R  e  U  N  S  a^ V  a  X  X  X  b< b  W  X  E',
    'c^ R  e  U  N  S  a  a  a  X  d^ X  X  X  X  X  E',
    'c  R  e  e> N  S  S  S  S  S  d  d  d  d  d  d  E',
    'c  R  R  R  N  N  N  N  R  R  R  f< f  f  g^ d  d',
    'c  h  h> R  R  R  R  R  R  i  i  i> j^ f  g  g  d',
    'c  h  k< k  k  k  k  k  m  i  j  j  j  f  f  g  d',
    'c  c  l< l  n< n  n  k  m  i  m  m> g  g  g  g  d',
    'o  o  o> l  l  n  n  k  m  m  m  g  g  d  d  d  d',
    'o  k  k  k  k  k  k  k  d  d  d  d  d  d  p< p  p',
  ],
  { curls: true },
);
