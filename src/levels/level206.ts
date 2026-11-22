import { levelFromMap } from './levelMap';

/** Level 206 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 20621, attempt 28), score 76 (Very hard). */
export default levelFromMap(
  206,
  [
    'C  C  C  o< o  o  o  o  o  p^ u  u  u  u  u  u',
    'C  v  C  C  C  C  q  q> o  p  u  r  r  r  r> s^',
    'C  v  z  z  t^ C  o  o  o  u< u  E  E  E  E  s',
    'v^ v  z  z  t  C  o  w^ x< x  x  E  y< y  E  s',
    'v  v  zv z  t  C  o  w  A  A> x  E  B^ y  E  s',
    'v  v  t  t  t  C  o  w  E  E  E  E  B  y  E  s',
    'K  K  C< C  C  C  o  w  E  D  D  D> y  y  Ev s',
    'K  F< F  F  F  F  F  G  G> D  h  h  h  h  h  H^',
    'K  R  R  I< I  G  G  G  J^ D  D  D  D  Q  h  H',
    'Kv R  O  O  I  G  J  J  J  G  G  G  D  Q  h  H',
    'R  R  O  L^ I  G  G  G  G  G  N  G  D  Q  h  H',
    'R  M^ O  L  I  I  N  N  N  N  N  G  D  Q  h  H',
    'R  M  O  L  L  I  N  D  D  D  D  D  D  Q  h  h',
    'R  M  O  M  M  I  N  D  N  N  N  N  N> Q  Q  h',
    'R  M  O  O> M  I  N  N  N  P  P  P  P  P> Qv h',
    'Rv M  M  M  M  I  f  S^ c  c  c  c  c  h  h  h',
    'd  d  d  d  d  d  f  S  V^ a  a  a  c  h  i  i',
    'd  T^ b  b  U^ d  f  S  V  V  V  av c  h  .  i',
    'd  T  bv U  U  f  f  S  g  n  n  c< c  h  i  i',
    'dv T  T  e  e> f  f> S  g  g> n  n  n  h  i  j',
    'k  k  T  e  S  S  S  S  l  l  l  m  n  hv iv jv',
    'kv T  T  e  e  e  l< l  l  m< m  m  n  n  n  n>',
  ],
  { curls: true },
);
