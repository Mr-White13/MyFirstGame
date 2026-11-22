import { levelFromMap } from './levelMap';

/** Level 202 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 20204, attempt 28), score 76 (Very hard). */
export default levelFromMap(
  202,
  [
    'o  o  o  o  o  o  S  S  S  S> o  d  d  d  d  T^',
    'o  V  V  V  V  o  o  o  o  o  o  d  U< U  d  T',
    'o  Vv c  a^ V  V  V  b< b  b  i  d  e  U  d  T',
    'o  p  cv a  a  a  a  a  a  b  i  i  e  d< d  T',
    'o  p  p  q  q  g  g  g  a  b  b  i  e  e  e> T',
    'o  o  p  f^ q  gv h< h  a  l  i< i  j  j> T  T',
    'y  o  p  f  q  r  k^ h  a  l  l  l  l  l  T  l^',
    'y  o  p  f  q  r  k  h  m< m  m  m  m  l  l  l',
    'y  o  p  f  q  r  k  h  h  v  v  v  m  v  v  n^',
    'y  ov pv q< q  rv k  u  h  v  s^ v  m  m  v  n',
    'y  t< t  t  t  t  k  uv h  v  s  v  v  v  v  n',
    'y  y  y  y  y  t  k  k  h  v  s  s  s  s  s  n',
    'E  E  E  E  y  t  t  k  h  v  v  v  v  v  v> n',
    'E  w< w  x^ y  D  D  k  k  k  A  A  B  B  n  n',
    'E  N  w  x  y  y> D  D  D  D  A  A  B  B  n  C',
    'E  N  w  x  x  z< z  z  z  D  A  A> Bv B  n  Cv',
    'E  N  w  w  w  w  w  w  z  D  D  D  D  D> n  n',
    'E  N  K  K  K  K  L  F  F  F  I  I  Q  Q  Q  n',
    'Ev N  Kv H  H  K  L  F  G  Fv G^ I  Q  R  Q  n',
    'N  N  H< H  J  K  L  F  G  G  G  Iv Q  R  Q  n',
    'N  J< J  J  J  K  L  L> M  M  M  M> Q  R  Q  n',
    'N  N> O  O  O  O  O> P  P  P  P  P> Qv Rv Q  n',
  ],
  { curls: true },
);
