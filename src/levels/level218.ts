import { levelFromMap } from './levelMap';

/** Level 218 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 21805, attempt 23), score 77 (Very hard). */
export default levelFromMap(
  218,
  [
    'u< u  u  u  u  u  v< v  w  w  w  w  w  w  w> x^',
    'N  N  N  N  N  u  y^ v  w  w  D  D  z< z  z  x',
    'N  C  A  A> N  u  y  v  w  w  D  B  B  B> z  x',
    'N  C  A  C^ N  u  v  v  w  w  D  D> E  E  E> x',
    'N  C  A  C  N  u  v  F^ E  E  E  E  E  G< G  x',
    'N  C  C  C  u  u  v  F  E  H  x  x  x  x  x  x',
    'N  N  N  N  N  N  v  F  H< H  x  P  P  P  I^ J^',
    'Q  Q  Q  Q  Q  N  v  F  F  F  x  P  K^ P  I  J',
    'L^ M< M  M  Q  N  v  N^ O  O> x  P  K  K  I  J',
    'L  W  W> M  Q  N  N  N  O  x  x  P  P  P> I  J',
    'L  W  V  M  Q  R  R  R  O  O  O  I  I  I  I  J',
    'L  W  V  M  Q  R  Q^ R  R> S  S> I  T^ U^ J  J',
    'V^ W  V  M  Q  Q  Q  S  S  S  I  I  T  U  J  a^',
    'V  V  V  M  M  M  b  b  b  b> T  h  T  U  a  a',
    'd  d  d  d  d  M  f  f  f  c^ T  h  T  U  U  U',
    'dv e  e  e> d  M  f  i  fv c  T  h  T  g  g> U',
    'M  M  M  M  M  M  i  i  c  c  T  hv T  g  t  t',
    'M  r  n  n  i< i  i  m  m  m  T  T  T  g  g  t',
    'M  r  n  o  o  o  j  j  j> m  m  m  m  m  g  t',
    'M  r  n  o  k^ o  j  s  s  l< l  l  l  mv g  t',
    'M  r  nv k  k  ov j  s  p  p  p  p  p  p> q^ t',
    'M  r  r  r  r  r> j  s  s  s  s> q  q  q  q  tv',
  ],
  { curls: true },
);
