import { levelFromMap } from './levelMap';

/** Level 274 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 27411, attempt 13), score 78 (Very hard). */
export default levelFromMap(
  274,
  [
    'S   A^  O   O   C   C   C   C>  K   K   E   E   E   E>  Q   Q   Y   Y',
    'S   A   O   C   C   A   A   G^  P   K   E   I   I   I>  K^  Q   Y   M^',
    'S   A   O   O   O   O>  A   G   P   K   K   K   K   K   K   Q   Y   M',
    'S   A   A   A   A   A   A   G   P   P   P   P>  G   G   G   Qv  Y   Y',
    'S   a   a   a   a   a   a   G   G   G   G   G   G   R   R   R   R>  Y',
    'S   S   S   S   S>  T^  a   U^  R   R   R   R   R   R   X   X   X   Y',
    'V^  W   W>  V   V   T   a   U   U   X   X   X   X   X   X   b   Xv  Yv',
    'V   V   V   V   T   T   a   a   U   X   Z   Z   Z   Z   Z>  b   b   b',
    'a0^ T   T   T   T   b0< b0  a   a   X   Z   c0  c0> f0  f0  f0  f0  b',
    'a0  T   d0  d0  d0  d0  d0  d0  a   X   Z   c0  e0  e0  e0  e0  f0  b',
    'a0  d0< d0  a0  e   e   e   e   a   X   Z   c0  c0  c0  c0  e0v f0  b',
    'a0  a0  a0  a0  e   e   e   e   a   X   Z   Z   Z   Z   Z   Z   f0v b',
    'g0^ e   e   e   e   e   e   e   a   a   a   a   a   a>  h   Z   Z   bv',
    'g0  e   c<  c   c   c   c   e   d<  d   p   p   p   p   h   i   i   i',
    'g0  ev  o   l   l   l   l   e   f   f>  p   g   g>  p   h   h   h>  iv',
    'g0  g0  o   l   m   j<  j   e   e   e   p   g   n   p   p   p   p   q',
    'k   g0  o   l   m   m   m   m   p   p   p   g   n   t   x   x   x   q',
    'kv  g0  o   l   l   l   l>  mv  p   g   g   g   nv  t   t   u   x   q',
    'B   B   o   o   o>  z   z   z   p   p   p   p   p   p>  t   u   x   qv',
    'B   D   D   D   D   H   H   z   r^  s<  s   s   s   s   tv  uv  x   J',
    'B   D   v<  v   D   H   w^  z   r   r   r   x   x   x   x   x   x   J',
    'B   D   D   v   D   H   w   z   F   F   r   xv  y   y   y   y>  J   J',
    'B   v   v   v   D   H   w   z   z>  F   r   J   J   J   J   J   J   N',
    'Bv  D<  D   D   D   H   F<  F   F   F   r   J   L   L   L   L   L   N',
    'H<  H   H   H   H   H   J<  J   J   J   J   J   Lv  N<  N   N   N   N',
  ],
  { curls: true },
);
