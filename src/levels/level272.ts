import { levelFromMap } from './levelMap';

/** Level 272 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 27202, attempt 13), score 79 (Very hard). */
export default levelFromMap(
  272,
  [
    'A^  C<  C   C   C   E^  G<  G   G   G   I<  I   S   S   S   S   S   S',
    'A   A   E   E   E   E   K<  K   K   M<  M   I   S   W   W   W   W   N^',
    'O^  A   E   U   U   V   P^  Q^  M   M   M   I   S   W   R<  R   W   N',
    'O   A   X   X   U   V   P   Q   M   S^  I   I   S   W   .   R   R   N',
    'O   A   X   U   U   V   P   Q   M   S   S   S   S   W   T   T>  R   N',
    'O   A   X   Uv  V<  V   P   Q   M   M   M   M   M   Wv  R   R   R   N',
    'A   A   X   X   X>  P   P   Q   N   N   N   Y^  N   N   N   N   N   N',
    'A   e0  e0  e0  Q   Q   Q   Q   Z<  Z   N   Y   N   u   u   u   u   u',
    'A   e0  a0^ e0  Q   b0< b0  b0  b0  b0  N   Y   N   u   a   a   a   u',
    'A   a0  a0  e0  Q   Q   Q   Q   c0^ b0  N   Y   N   u   d0  d0> a   u',
    'A   e0< e0  e0  A   c0  c0  c0  c0  b0  N   Y   N   d0  d0  f0  a   u',
    'A   A   A   A   A   b0  b0  b0  b0  b0  N   N   N   f0< f0  f0  av  u',
    'b^  d   c<  c   c   c   d^  e   e   e   e   e   u   u   u   u   u   u',
    'b   d   d   d   d   d   d   ev  i   i   i   e   u   f<  f   f   f   f',
    'b   g^  h^  k   k   k   i<  i   i   m   i   j^  u   u   v   v   v   v',
    'b   g   h   kv  l^  m<  m   o   o   m   i   j   j   u   v   n<  n   v',
    'b   g   g   g   l   l   m   ov  m   m   i   r   j   u   p^  q   n   v',
    'b   b   b   b   b   b   m   m   m   i   i   r   j   u   p   qv  n   v',
    'B   B   B   B   B   b   r<  r   r   r   r   r   j   u   p   p   n   v',
    'B   s^  t<  t   t   t   t   u<  u   u   u   u   u   u   J   J   v<  v',
    'B   s   w^  x<  x   x   x   x   x   y<  y   y   y   y   J   z<  z   z',
    'B   s   w   w   w   w   s   s   x   y   y   y   y   y   J   L   L   z',
    'B   s   s   s   s   s   s   x   x   y   y   y   y   y   J   L   L   z',
    'Bv  D<  D   D   D   D   F<  F   F   F   F   F   y   y   J   L   L   z',
    'H<  H   H   H   H   D   D   D   D   D   D   J<  J   J   J   L   L>  z',
  ],
  { curls: true },
);
