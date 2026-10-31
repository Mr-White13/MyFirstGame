import { levelFromMap } from './levelMap';

/** Level 30 — difficulty spike, generated from tools/level-plan.json (seed 3050, attempt 2), score 73 (Very hard). */
export default levelFromMap(
  30,
  [
    'a  a  a  b< b  b  b  b  c< c  c  c',
    'f  f  a  d< d  d  d  e  e> l  l  l',
    'fv i  a  j  j  j  d  e  g< g  g  l',
    'm  i  a  j  d  d  d  h< h  h  g  l',
    'm  iv av jv k  k  k  k> g  g  g  lv',
    'mv n  n  n  n  o  s  p  p  q  q  q',
    'w  w  w  w  nv ov s  pv t  qv J  q',
    'w  r  r> w  w  M  s  v  t  y  J  J',
    'w  u  u  u  u  M  sv v  tv y  C  J',
    'w  uv x  x  x  M  v< v  y  y  C  J',
    'w  w> G  D  xv M  B  z  yv C  C  J',
    'G  G  G  D  L  M  B  z  z> C  J  J',
    'G  A< A  D  L  M  Bv I  C< C  J  K',
    'G  E  A  Dv L  M  M  I  I  F  J  K',
    'G  E  E  E> L  H  M  N  I  Fv J  K',
    'G  G  G  G> L  Hv M  N  I  I> Jv Kv',
    'L< L  L  L  L  M< M  N  N  N  N  N>',
  ],
  { revision: 3 },
);
