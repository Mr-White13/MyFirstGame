import { levelFromMap } from './levelMap';

/** Level 229 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 22902, attempt 16), score 78 (Very hard). */
export default levelFromMap(
  229,
  [
    'z  B  B  B  B  B  B  B  K  K  x  x  x  x  x  x  x',
    'z  z  z  W  B  B  B  B  K  x< x  A  A  A  A  A  y^',
    'z  z  zv W  B  B  B  B  K  K  U  F  G  G  G  Av y',
    'H  H  H  W  L  L  L  Bv D  K  U  F  G  C^ G  y  y',
    'H  I  H  W  L  D< D  D  D  K  U  F  G  C  G  y  Q',
    'H  I  H  W  L  J  J  J  E^ K  U  Fv G  C  Gv y  Q',
    'H  I  Hv W  L  M  M  J  E  K  U  U  U  U  U  U  Q',
    'H  Iv W  W  L  M  J< J  E  K  K  K  K  K  K> U  Q',
    'H  W  W  b  Lv M  M> E  E  N  N> O  O  O  U  U  Q',
    'W  W  T  b  b  b  b  b  b  N  O  O  N  Ov U  g  Q',
    'W  T  T  P  P  P  P  P> b  N  N  N  N  S  U  g  Qv',
    'W  T  R< R  R  R  R  e  b  S< S  S  S  S  U  g  g',
    'W  T  T  T  T  T> e  e  b  b  b  b  b  b  U  U> g',
    'W  e  e  e  e  e  e  a  a  V< V  V  V  b  V  V  g',
    'Wv e  c  c  c  c  a< a  h  h  h  r  V  b  b> V  g',
    'e  e  cv d< d  d  d  d  h  r  r  r  V  V  V  V  g',
    'ev f< f  f  f  f  f  d  h  r  w  w  g< g  g  g  g',
    'n  n  i  q  q  k  d  d  hv r  r  w  w  w  w  w  w',
    'p  n  i  i> q  k  l  l  l  l  r  j  j  j  j  j> w',
    'p  n  q  q  q  k  k  k  k> lv r  j  m  m  m  m> w',
    'p  nv q  o  o  o> u  r  r  r  r  j  j  j  j  j  w',
    'p  p> qv o  t  u  u  rv j  j  j  s  s  s  s> j  w',
    't< t  t  t  t  uv v  v  v  v> j  j  j  j  j  j  wv',
  ],
  { curls: true },
);
