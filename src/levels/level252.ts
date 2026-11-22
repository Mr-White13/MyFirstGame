import { levelFromMap } from './levelMap';

/** Level 252 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 25221, attempt 27), score 78 (Very hard). */
export default levelFromMap(
  252,
  [
    'a<  a   a   a   a   a   k   k   k   k   k   k   e<  e   e   e   e',
    'h^  j<  j   j   j   a   kv  a   s   l   l   k   m   m   m   m>  e',
    'h   n^  u   u   u   a   a   a   s   l   o^  k   p   p   p>  q^  e',
    'h   n   u   r^  u   r   s<  s   s   l   o   k   p   F   t^  q   e',
    'h   n   uv  r   r   r   O   O   O   l   l>  k   p   F   t   q   e',
    'v^  n   n   n   O   O   O   B   O   k   k   k   w^  F   t   t   t',
    'v   v   v   v   O   P   P   B   O   k   w   w   w   F   x<  x   x',
    'y^  z^  y   v   O   P   B<  B   k   k   G   D^  F<  F   C<  C   x',
    'y   z   y   v   O   P   P   G<  G   G   G   D   D   I<  I   C   x',
    'y   y   y   v   O   A   P   L   L   L   L   L   D   D   D   D   E^',
    'O   O   O   O   O   A   P   L   K   K   H^  L   L   L   L   D   E',
    'O   J^  R   R   R   A   P   L   K   Kv  H   E   E   E   E   E   E',
    'O   J   R   J   R   Av  P   L   K   H   H   E   N   N   N   Z   Z',
    'O   J   R   J   R   P   P   L   L   L   L   L>  N   M   N   M^  Z',
    'O   J   J   J   R   P   N<  N   N   N   N   N   N   M   M   M   Z',
    'O   O   O   O>  R   Pv  Q   Q   Q>  W   U   U   U   U   U   U   Z',
    'R<  R   R   R   R   Q   Q   S   S>  W   W   T   T   T   T>  Uv  Z',
    'c   c0  c0  c0  c0  Q   S   S   V^  S   W   W   W   W   W>  Z   Z',
    'c   c0  b   b   c0  Q   S   V   V   S   b0  b0  b0  b0  b0  Z   X^',
    'c   c0  b   c0  c0  Q   S   V   V   S   b0  Y<  Y   Y   b0  Zv  X',
    'c   c0  b   c0  a0^ Q   S   S   S   S   b0  i   i   i   i   i   X',
    'c   c0  b   c0  a0  Q   b0< b0  b0  b0  b0  d   d   d   d   i   X',
    'c   c0v bv  c0  c0  c0  c0  c0  g   g   g   dv  f<  f   d   i   X',
    'cv  g<  g   g   g   g   g   g   g   i<  i   i   i   i   i   i   X',
  ],
  { curls: true },
);
