import { levelFromMap } from './levelMap';

/** Level 215 — chapter 11, one-life level (normal board, a single heart), full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 21500, attempt 1), score 77 (Very hard). */
export default levelFromMap(
  215,
  [
    'y^ D  D  D  D  D  D  A  A  A  I  I  I  I  I  I',
    'y  D  z< z  z  z  D  Av F  A  I  B  B> C  C> I',
    'y  Dv H  H  H  H  E^ O  F  F> I  B  G^ C  S  S',
    'y  H  H  y  y  y  E  O  I  I  I  B  G  C  C  S',
    'y  Hv y  y  E  E  E  O  Iv J^ B  B  G  K  K> S',
    'y  y  y  L^ T  M  M> O  O  J  B  J  G  K  S  S',
    'N^ V  V  L  T  M  P  P  Ov J  J  J  K  K  S  X',
    'N  U  V  L  T  M  M  P  P  P  P  P  P> S  S  X',
    'N  U  V  L  T  Q< Q  Q  R< R  R  R  R  Sv W  X',
    'N  U  V  L  Tv L  L  Q  Q  Q  f  W  W  W  W  X',
    'N  Uv Vv L  L  L  e  e  e  Q  f  W  W  W> a  Xv',
    'N  N  N  n  n  n  n  n  e  Q  f  a< a  a  a  g',
    'b  o  N  n  c  c  c  c  e  Q  f  g  g  g  g  g',
    'bv o  N  n  cv d< d  c  ev Q  fv gv h  h  i  k',
    'o  o  N  n  n  n  c  c  j  Q  h< h  h  i< i  k',
    'o  p  N  N  N  n  j< j  j  Q  k< k  k  k  k  k',
    'o  p  l  m  m  n  n  q  q  Q  x  x  x  x  x  x',
    'o  p  l  l> mv q  nv q  q  x  x  t  t  t  t  x',
    'ov p  p  p  p> q  q  q  q  x  s  t  u  x  t  x',
    'r  r  q< q  q  q  q  q  q  x  s  t  u  x  t  x',
    'rv v  v  v  v  v  v  q  q  x  sv tv uv x  t  x',
    'v< v  w  w  w  w> v  q  q  x  x  x  x  x  t  xv',
  ],
  { lives: 1, curls: true },
);
