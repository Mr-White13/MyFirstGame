import { levelFromMap } from './levelMap';

/** Level 205 — chapter 11, one-life level (normal board, a single heart), full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 20502, attempt 12), score 77 (Very hard). */
export default levelFromMap(
  205,
  [
    'y  y  y  u< u  u  u  u  w  w  w  w  w  w  v  v>',
    'C  C  y  A  A  x  x  x  wv z  z  z  z  w  v  x^',
    'C  y< y  B  A  x  S  x  x  x  x  x  zv w  v  x',
    'C  A^ D  Bv A  A  S  S  S  S  S  x  v  w  v  x',
    'Cv A  D  D  D> A  G  G  G  G  S  x  v  w  v  x',
    'F  A  A  A  A  A  E  E  E> G  S  x  v  v  v  x',
    'F  F  F  F  F  F> E  R  R  Gv S  x  x  x  x  x',
    'K  K  O< O  O  H^ E  E  R  R  S  S  S  S  S  S',
    'J  K  K  U  O  H  H  H  H  R  N  N  Q  Q  I^ S',
    'J  J> Kv U  O  L  W  R  R  R  M  N  N  Q  I  S',
    'U  U  U  U  O  Lv W  R  a  P  M  M> Nv Q  I  S',
    'U  V  V  V  O  O  W  R  a  P  P  P  P> Qv I  S',
    'U  V  W  W  W  W  W  Rv a  T  S< S  S  S  S  S',
    'U  V  W  g  d  a  a  a  a  T  T  T  T> c  f  f',
    'Uv Vv W  g  d  a  i  i  b  b  b  b  b  c  f  j',
    'W< W  W  g  d  a  a> i  e  e  e  e  b  c  f  j',
    'k  k  k  g  d  h  h  i  e  n  n  e  bv cv f  j',
    'k  o  k  g  d  d> h  i  l  l  n  e  e  e> fv j',
    'k  o  k  gv h< h  h  i  i> l  n  n  n  n  n  jv',
    'kv o  k  k  k  k  k  k  l< l  m< m  m  m  n  t',
    'o  o  p  p  p  q  q  r  r  r  r  m  m  m  nv t',
    'ov p< p  q< q  q  r< r  s< s  s  s  s  s  t< t',
  ],
  { lives: 1, curls: true },
);
