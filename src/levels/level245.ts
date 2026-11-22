import { levelFromMap } from './levelMap';

/** Level 245 — chapter 13, one-life level (normal board, a single heart), full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 24504, attempt 29), score 77 (Very hard). */
export default levelFromMap(
  245,
  [
    'P   A<  A   A   T   T   T   T   T   T   E   E   E   E   E   E>  G^',
    'P   M   M   A   T   H^  I^  H   H   T   E   R   R   R   R   G   G',
    'P   M   A   A   J^  H   I   I   H   T   K^  Q   Q   Q   R   G   L^',
    'P   M   M>  N   J   H   H   H   H   T   K   O   O>  Q   R   G   L',
    'Pv  N   N   N   J   J   J   J   J   T   K   K   Q<  Q   Rv  G   L',
    'n   N   U   U   U   U   S<  S   J   T   T>  K   K   K   K   G   L',
    'n   N   Uv  V   V   U   V^  S   J   L   L   L   G   G   G   G   L',
    'n   N   X   X   V   V   V   J   J   W<  W   L   L   L   L   L   L',
    'n   N   N>  X   X   X   X>  J   a0  a0  a0  m   m   m   m   m   m',
    'n   a   a   a   a   a   a   J   a0  a0  a0  m   Y<  Y   Y   .   m',
    'n   n   n   n   n   n   a   J   a0  b0  b   b   b   j   Y   m   m',
    'Z   Z   Z   Z   Z>  n   a   J   a0v b0  b0  b0> bv  j   Y   m   d^',
    'n   n   n   n   n   n   a   J   J   J   J   J   J   j   Y   m   d',
    'n   k   k   k   k   k   av  c<  c   c   c   i   i   j   Y   m   d',
    'n   k   e   e   e   e   h   h   h   h   c   c   i   j   Y   m   d',
    'n   k   ev  f<  f   e   h   g   g>  h   h   h>  iv  j   j>  m   m',
    'n   k   k   k   k>  h   h   g   p   p   p   p   p   p   l   l>  mv',
    'n   n>  B   p   p   p   p   p   p   l   l   l   l   l   l   z   z',
    'B   B   B   p   C   o<  o   o   o   o   o   s   s   y   z   z   z',
    'B   p<  p   p   C   x   x   x   x   x   o   s   o   y   u   q^  z',
    'B   r^  D<  D   C   x   w   w   w   w   o   sv  o   y   u   q   z',
    'B   r   v   D   C   x   w   t   t>  w   o   o   o   y   uv  q   z',
    'B   r   vv  D   C   x   x   x   x   wv  x   x   x>  yv  q   q   zv',
    'Bv  r   D   D   C   C   C   C>  x   x   x   F   F   F   F   F   F>',
  ],
  { lives: 1, curls: true },
);
