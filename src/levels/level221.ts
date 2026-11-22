import { levelFromMap } from './levelMap';

/** Level 221 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 22102, attempt 11), score 79 (Very hard). */
export default levelFromMap(
  221,
  [
    'x^ C  y  y  y  y  x  x  x  x  x  x  F  F  F  F  F',
    'x  C  y< y  y  y  x  z^ A  A  A> x  B  B  B  B> F',
    'x  C  C  C  C  C> x  z  A  D^ B  B  B  E^ w  w  Fv',
    'x  G  G  G  G  G> x  z  A  D  T  T  T  E  E  w  M',
    'x  G  H  H  H> x  x  z  A  D  I  I> T  T  T  w  M',
    'x  x  x  x  x  x  z  z  A  D  I  J^ K< K  T  w  M',
    'L^ z  z  z  z  z  z  A  A  D  I  J  J  K  T  w  M',
    'L  z  L  L  L  L  L  A  D  D  I  K  K  K  T  w  Mv',
    'L  z  L  R  R  R  L  A  D  N  N  N> a  a  T  w  w',
    'L  z  L  R  O< O  L  A  D  N  W  W  P^ a  T  Q^ w',
    'L  L  L  R  R  R> L  A  D  N  W  S^ P  a  Tv Q  w',
    'U  U  U  U  U> V^ L  A  D  N  Wv S  P  a  a> Q  w',
    'U  g  g  g  g  V  L  D  D  Q  Q  Q  Q  Q  Q  Q  w',
    'U  g  b^ c< c  V  V  D  d  d  d  f  f  f  f  w  w',
    'U  g  b  b  c  c  V  D  dv s  d  f  e  e> fv w  i',
    'U  g  g  g  g  g> V  D  s  s  d  f  h  h  h> w  i',
    'U  j  V  V  V  V  V  D  s  d  d  f  h  u  u  w  iv',
    'j  j  j  j> k^ D  D  D  s  l  l> f  h  h  u  w  w',
    'j  j  j  m^ k  D  D  D  s  l  f  f  n^ h  u  o^ w',
    'p  p  p> m  k  k  k  D  s  l  n  n  n  h  u  o  w',
    'p  q  q> m  r  r^ k  D  sv n  n  t  t> h  u  o  w',
    'p  q  m  m  r  r  k  n  n  n  t  t  h  h  uv o  w',
    'p  q  v< v  v  v  k  h  h  h  h  h  h  o  o  o  wv',
  ],
  { curls: true },
);
