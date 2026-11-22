import { levelFromMap } from './levelMap';

/** Level 237 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 23700, attempt 13), score 77 (Very hard). */
export default levelFromMap(
  237,
  [
    'O   P   P   A   A   A   A   A   A>  G^  H   H   H   H   H   H>  I^',
    'O   J^  P   A   K<  K   K   K   L^  G   H   Q   Q   Q   Q   Q>  I',
    'O   J   P   A   A   K   K   K   L   G   H   Q   M   M>  N   N>  I',
    'O   J   P   O^  L   L   L   L   L   G   Q   Q   M   N   N   S   I',
    'O   P<  P   O   L   Q   G   G   G   G   Q   R^  M   N   S<  S   I',
    'O   O   O   O   L   Q   Q   Q   Q   Q   Q   R   M   I   I   I   I',
    'T^  c   c   c   L   U^  V<  V   V   V   V   M   M   I   W   W   W^',
    'T   c   a   a   L   U   U   U   U   U   V   M   a0  I   W   W   W',
    'T   c   c   a   L   L   L   L   L   X^  V   M   a0  I   Y   Y   Y>',
    'T   .   c   a   Z<  Z   Z   Z   L   X   V   a0< a0  I   Y   i   b^',
    'T   c<  c   a   d<  d   e^  Z   L   X   V   V   V   I   I   i   b',
    'T   T   a<  a   f^  d   e   Z   L   X   X   X   X   X   I   i   b',
    'g   g   g   g>  f   d   e   Z   h   h   h   h   h>  i^  I   i   b',
    'g   l   l>  o^  f   d   Z   Z   h   j   k   k>  j^  i   i   i   b',
    'g   l   o   o   f   d   d   d   d   j   j   j   j   d   d   d   d',
    'g   l   o   t   m<  m   m   m   d   d   d   d   d   d   n^  p   p',
    'g   o   o   t   s   s   s   s   s   s   n   n   n   n   n   pv  q^',
    'g   g   g   t   s   n   n   n   n   n   n   C<  C   C   C   C   q',
    'r^  y^  s^  tv  s   n   u   u   u   u   u>  v   v   v>  w^  C   q',
    'r   y   s   s   s   n   u   x   x   x   x>  u   u   u   w   C   q',
    'r   y   B^  D   z^  n   u   u   u   u   u   u   w   u   w   C   q',
    'r   B   B   D   z   n   n   n   n   E   E   E   w   w   w   C   q',
    'r   D<  D   D   z   z   z   E<  E   E   F<  F   F   F   F   F   F',
  ],
  { curls: true },
);
