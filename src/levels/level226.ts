import { levelFromMap } from './levelMap';

/** Level 226 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 22603, attempt 15), score 77 (Very hard). */
export default levelFromMap(
  226,
  [
    'A  A> C  C  C  C  D  D  D  D  D  D  E  E  J  J  J',
    'A  B< B  B  B  Cv D  G  G  G  G  D  D> Ev J  .  J',
    'A  F  F  F  F  F> D  D  D  M  G  G  G  G  G> J  J',
    'A  F  U  H  H  H  H  H> D  M  I  I  I  I  I> Jv R',
    'A  F  U  D  D  D  D  D  D  M  I  N  N  N  N  N  R',
    'A  A  U  D  Q  K  K> L  L> Mv I  Nv O  O  O> N  R',
    'Z  A  U  D  Q  K  L  L  P  T  T  T  N  N  N  N  R',
    'Z  U  U  D  Q  K  K  X  P  T  P^ T  R  R  R  R  R',
    'Z  U  W  D  Q  Q> K  X  P  T  P  T  Rv S  S  S> n',
    'Z  U  W  W  W  W  W  X  P  P  P  Tv n  n  n  n  n',
    'Z  Uv V< V  V  l  Wv X  X  X  X  X> n  n  n  n  n',
    'Z  c  Y  Y> V  l  l  i  i  e  e  e  n  n  n  n  n',
    'Zv c  Y  d  d  d  l  h  i  e  e  e  n  a< a  a  a',
    'k  c  Y  d  b< b  l  h  i  e  m  m  n  o  o  a  a',
    'k  cv Y  d  d  d> l  h  i  e  e> m  n  j  o  f  f>',
    'k  g  g  g  g  g> l  hv i  i  i> m  n  jv o  f  f',
    'kv l< l  l  l  l  l  m< m  m  m  m  nv o< o  x  x',
    'y  y  y  y  p< p  p  q< q  q  q  q  r  r  r  r> x',
    'y  s< s  y  t  t  p  z  z  z  z  q  r  w  w  w  x',
    'y  u  s  y  tv t  p  z  v  v  z  q  r  w  r  w  x',
    'y  uv s  y  p  t  p  z  z  v  z  q  r  r  r  w  x',
    'y  s  s  y  p  t  p  v< v  v  z  q  w< w  w  w  xv',
    'yv s  y  y  p  p  p  z< z  z  z  q  q  q  q  q  q',
  ],
  { curls: true },
);
