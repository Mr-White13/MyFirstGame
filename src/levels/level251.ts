import { levelFromMap } from './levelMap';

/** Level 251 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 25109, attempt 1), score 77 (Very hard). */
export default levelFromMap(
  251,
  [
    'y  j  j  j  j  j  j  W< W  W  W  X  X  X  X  X  X>',
    'y  j  a< a  a  a  j  j  b< b  W  X  c< c  c  c  c',
    'y  y  l  l  l  l  l  j  W  W  W  X  o  o  q  q  c',
    'd^ y  y  y  e  e  l  j  j  j  j  X  X  o  q  f^ g^',
    'd  h< h  y  e  i^ l  l  l  k  jv k^ o  o  q  f  g',
    'd  d  h  y  e  i  i  i  lv k  k  k  o  m^ q  f  g',
    'n^ h  h  y  ev i  i  i  s  s  s  s  ov m  q  f  g',
    'n  h  n  y  p  p  p  p  p  p> r  s  w  m  qv f  g',
    'n  n  n  y  y  y  y  y  y  r< r  s  w  m  m  f  f',
    'x  u  u  u  u  u  u  P  y  s< s  s  w  w  w  w  J',
    'x  u  t< t  t  t  uv P  y  v< v  v  v  v  v  wv J',
    'xv u  P  P  P  P  P  P  yv z  z  z  z  z  z  z> J',
    'u  u  P  H  H  H  H  H  H  A< A  A  J  J  J  J  J',
    'P  P  P  H  E  E  E  E  H  B  B  A  J  K  V  V  V',
    'P  H  H  H  E  H  H  H  H  B  A  A  J  K  V  L  V',
    'P  H  D  D  E  H  F  F  F  B  B> C^ J  K  V  L  V',
    'P  H  Dv E< E  H  Fv U  F  F  F  C  J  K  V  L  V',
    'P  H  G< G  G  Hv U  U  I< I  C  C  Jv Kv L< L  V',
    'P  P  P  P  P  P  U  M  M> I  I  V  V  V  V  V  V',
    'S  N  N  N  N  P  U  M  Q  Q  I  V  T  T  T  T  T',
    'S  N  O  O  N  P  U  M  Q  M  I  V  T  R  R  R  T',
    'S  N  N> O  O> Pv U  M  Qv M  I  V  T  Rv T  R  T',
    'S  S  S  S  S> U  U  M  M  M  I  V  T  T  T  R  Tv',
    'U< U  U  U  U  U  I  I  I  I  I  V  V  V  V  V  V>',
  ],
  { curls: true },
);
