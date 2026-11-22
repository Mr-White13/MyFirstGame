import { levelFromMap } from './levelMap';

/** Level 223 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 22311, attempt 15), score 78 (Very hard). */
export default levelFromMap(
  223,
  [
    'G  G  G  G  G  G  v  w  w  w  w  y  y  Q  Q  Q  Q',
    'x  x  x  z  I  G  v  v  v> .  w  w> y  Q  A  A  Q',
    'xv E  E  z  I  G  Q  Q  Q  Q  Q  Q  yv Q  A  A  Q',
    'H  E  z< z  I  G  Q  G  G  G  G  Q  Q  Q  Av B^ Q',
    'H  E  C< C  I  G  Q  G  D< D  G  G  G  G  G  B  Q',
    'H  E  E  E> I  G  G  G  F  F  F  F  F  F> Gv B  Q',
    'H  H  H  H> I  I> J  J  J  J> T  T  T  T  T  T  Q',
    'N  N  N  N  N  N  J  T  T  T  T  K< K  K  K  T  Q',
    'N  O  O  O  L^ N  J  T  M< M  M  M  M  M  K  T  Q',
    'Nv Ov L  L  L  N  J  T  P  P  P  P> K  K  K  T  Qv',
    'd  N  N  N  N  N  J  T  P  R^ S  S  U  U  U  T  b',
    'd  J  J  J  J  J  J  T  P  R  Sv R  U  a  U  Tv b',
    'd  J  e  e  e  e  e  e  P  R  R  R  U  a  U  U> b',
    'd  J  e  g  g  g  j  e  P  a< a  a  a  a  n  n  bv',
    'd  J  e  g  c  c> j  e  P  P  P  P  P  m  h  n  p',
    'dv J  e  g  c  .  j  e  e  e  e  e  e> m  h  n  p',
    'J  J  e  g  c  j  j  f  f  f  f> t  t  m  h  n  p',
    'e  e  e  gv c  j  f  f  l  l  l  l  t  m  hv n  p',
    'e  f  i^ c  c  jv f  k^ l  o  o  lv t  m  m> nv p',
    'e  f  i  c  r  r  f  k  l  ov k  u  t  p  p  p  p',
    'e  f  i  c  c  r  f  k  l  l  k  u  t  pv q  q  q>',
    'e  f  i  i  r< r  f  k  s< s  k  u  t  t  t  t  t>',
    'e  f  f  f  f  f  f  k  k  k  k  u  u  u  u  u  u>',
  ],
  { curls: true },
);
