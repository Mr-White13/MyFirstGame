import { levelFromMap } from './levelMap';

/** Level 265 — chapter 14, one-life level (normal board, a single heart), full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 26508, attempt 8), score 78 (Very hard). */
export default levelFromMap(
  265,
  [
    'M  M  M  M  M  M  x< x  x  x  x  x  y  y  y  A  y^ E',
    'z^ D  z  z  z  M  M  C  C  C  C  x  y  A^ y  A  y  E',
    'z  D  D  D  z  z  M  C  B  B> Cv x  y  A  A  A  y  E',
    'z  D  D  D  D^ z  M  x  x  x  x  x  y  y  y  y  y  Ev',
    'z  D  D  D  D  z  M  x  F< F  F  F  x  x  x  x  x  x',
    'z  D  D  D  D  z  M  x  x  x  x  x  x  G< G  G  H< H',
    'z  z  z  z  z  z  M  M  M  M  M  I  I  I  I> G  G  H',
    'P  P  P  P  P  P  J< J  J  J  M  I  H  H  H  H  H  H',
    'n  K  K  K  K> P  L^ Q  N  N  M  M  M> j  j  j  j  t',
    'n  K  U  U  U  P  L  Q  Q  N  N  N  N  N> O  O> j  t',
    'n  K  U  W  U  Pv L  L  Q  Q  Q  Q  Q  Q> O  T  j  t',
    'n  R^ U  W  S  S  S  S  S> O  O  O  O  O  O  Tv j  t',
    'n  R  Uv W  W  W  V< V  V  V  V  V  V  j  j  j  j  t',
    'n  R  R  R  R  Wv a  a  a  a  a  a> V  j  t  t  t  t',
    'n  d  d  d  d  d  a  b< b  b  b  b  V  j  t  f  f  f',
    'n  d  c< c  c  dv a  a  a  a  a  a  V  j  t  f  e^ f',
    'n  d  d  d  d  n  n  n  n  n  n  V  V  j  t  t  e  fv',
    'n  n  n  n  n  n  h  g< g  h^ n  V  m  j  j  t  t  t',
    'u  u  k  i< i  i  h  h  h  h  n  V  m  m  jv q  q  t',
    'u  u  k  k  k  k  k  k> r  r  n  o  o  m  q  q  l^ t',
    'u  r  r  r  r  r  r  r  r  n  n  o  m< m  q  l  l  t',
    'u  r  r  r  w  w  w  w  w  nv o  o  p  p  q  l  p  t',
    'u  r  r  r  w  o< o  o  o  o  o  p< p  p  q  q> p  t',
    'u  r< r  r  w  s  s  s  s> w  w  w  w  p  p  p  p  tv',
    'u  u  u  u> w  w  w  w  w  w  v  v> w  w  w  w  w  w>',
  ],
  { lives: 1, curls: true },
);
