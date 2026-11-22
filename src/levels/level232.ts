import { levelFromMap } from './levelMap';

/** Level 232 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 23201, attempt 5), score 78 (Very hard). */
export default levelFromMap(
  232,
  [
    'R  E  E  E  E  E  E  A  A  A  A  A  y  y  y  y^ z^',
    'R  E  C  C  C  C  E  Av B< B  B  A  y  y  y  y  z',
    'R  E  C  D  D  D  E  E  E  J  B  A  y  y  .  y  z',
    'R  E  Cv Dv F  F  H  H  E  J  B  A  y  y  y  y  z',
    'R  Ev F< F  F  G^ Hv G  E  J  B  A  y  y  y  y  z',
    'R  R  R  R  R  G  G  G  E  J  A  A  z  z  z  z  z',
    'k  k  k  k  R  I^ E  E  E  J  J> N  N  N  K  O  K^',
    'd  d  d  k  R  I  M  M  M  M  M  M  Q  N  K  O  K',
    'd  X  d  k  R  I  M  L< L  L  L  Mv Q  Nv K  Ov K',
    'd  X  d  k  R  I  P< P  P  Q< Q  Q  Q  S  K  K  K',
    'X  X  d  k  Rv i  i  i  P  S< S  S  S  S  T  T  T',
    'X  a  d  k  k  k  k  i  P  T< T  T  T  T  T  j  T',
    'X  a  d  d  d  d  k  i  P  P  c  c  g  U< U  j  T',
    'X  a  b  e  e  d  k  i  V^ P  W^ c  g  g  g  j  T',
    'Xv av bv e  n  d  k  i  V  P  W  cv w  w  g  j  T',
    'e  e  e  e  n  dv k  i  V  P  W  w  w  g  g  j  T',
    'ev f< f  t  n  k  k  i  V  P  P  w  g< g  h^ j  T',
    't  t  t  t  n  k  u  iv V  V  P  w  w  w  h  jv T',
    't  n  n  n  n  kv u  p  p  p  P  l< l  w  h  h  m^',
    't  nv r  u  u  u  u  o< o  pv P  q  l  w  .  h  m',
    't  r  r  u  v  v  v  v  o  o  P  qv l  w  h  h  m',
    't  rv u  u  s< s  s  v  P  P  P  l  l  w  m  m  m',
    'tv u< u  v< v  v  v  v  w< w  w  w  w  w  x< x  x',
  ],
  { curls: true },
);
