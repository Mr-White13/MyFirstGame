import { levelFromMap } from './levelMap';

/** Level 225 — chapter 12, one-life level (normal board, a single heart), full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 22502, attempt 19), score 77 (Very hard). */
export default levelFromMap(
  225,
  [
    'a<  a   a   a   a   a   e<  e   g<  g   h<  h   h   h   h   h   h',
    'i^  j^  e   e   e   e   e   e   k^  g   g   g   g   g   g   l^  h',
    'i   j   j   j   m   m   m   m>  k   F   F   F   F   F   F   l   h',
    'i   q   q   j   m   k   k   k   k   F   n   n   n   n>  F   l   h',
    'i   i   q   j   o<  o   F   F   F   F   n   F   F   F   F   l   h',
    'p^  q<  q   j   D   o   o   o   x   x   n   F   r^  s<  s   s   t^',
    'p   p   p   j   D   o   o   o   x   y^  n   F   r   u   u>  s   t',
    'v<  v   p   j   D   w^  x<  x   x   y   n   F   r   u   s   s   t',
    'z^  v   B<  B   D   w   w   w   w   w   w   F   r   u   u   u   t',
    'z   v   v   B   D   D   D>  C   C   C   C>  F   F   F   F   F>  t',
    'z   A^  B   B   C   C   C   C   E<  E   E   E   E   G^  t   t   t',
    'z   A   A   A   C   H   H   H   H   H   H   H>  E   G   G   G   G',
    'z   z   z   A   C   I   I>  S   S   S   P   E   E   J   J   J>  G',
    'K^  R   A   A   C   I   I   I   I   S   P   E   L^  J   M^  N^  G',
    'K   R   R   R   C   C   X   X   O^  S   Pv  E   L   J   M   N   G',
    'K   Q   Q>  R   R>  C   X   O   O   S   S   E   E   J   J   N   G',
    'K   Q   C   C   C   C   X   X   X   T   S   S>  E   N   N   N   G',
    'K   Q   Q   Q   Q   K   W   W   X   T   T   E   E   f   f   f   f',
    'K   K   K   K   K   K   W   X   X   T<  T   Z   Z   Z   Z   U^  f',
    'V^  a0  W<  W   W   W   W   Xv  Y<  Y   Y   Y   Y   Z<  Z   U   f',
    'V   a0  a0> c   c   c   c   c   U   U   U   U   b   b   b   U   f',
    'V   c   c   c   b0< b0  b0  c   U   U   U   U   U   b<  b   U   f',
    'V   d<  d   d   d   d   b0  c   c   c   c   c>  U   U   U   U   fv',
  ],
  { lives: 1, curls: true },
);
