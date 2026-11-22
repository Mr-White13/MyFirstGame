import { levelFromMap } from './levelMap';

/** Level 266 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 26622, attempt 8), score 79 (Very hard). */
export default levelFromMap(
  266,
  [
    'A<  A   A   A   A   A   A   A   A   A   A   A   A   C<  C   C   C   C',
    'E^  G^  H^  I   I>  J   J   J>  K   K   K   K>  A   A   A   A   A   L^',
    'E   G   H   I   J   J   I   M^  K   M   M   M   M   M   M   X   A   L',
    'E   G   H   I   I   I   I   M   M   M   X   X   X   X   X   X   A   L',
    'E   G   H   N^  O<  O   O   O   P<  P   X   Q^  T   T   A   A   A   L',
    'E   G   H   N   N   N   N   N   N   P   X   Q   Q   T   A   L   L   L',
    'E   G   H   H   R^  S<  S   S   N   P   X   Q   Q   Tv  A   A   A   A',
    'E   G   U^  H   R   V<  V   S   W<  W   X   X>  Z   Z   Z   Z   Z   Z',
    'E   G   U   H   R   R   V   S   Y^  W   Z<  Z   Z   a0< a0  a0  a0  a0',
    'E   G   H   H   b0^ R   V   S   Y   W   c   c   c0< c0  c0  c0  c0  a^',
    'E   G   H   b^  b0  R   V   S   Y   W   cv  c   Y   d   d>  e^  c0  a',
    'G   G   b   b   R   R   V   S   Y   W   g   g   Y   d   e   e   c0  a',
    'f   f>  b   o   o   o   o   o   Y   W   W   gv  Y   d   d   d   d   a',
    'f   b   b   o   b   h   f   o   Y   Y   Y   Y   Y   j   j   j   j   a',
    'f   b   o   o   b   hv  f   o   i   i   i   i   i>  jv  a   a   a   a',
    'f   b   b   b   b   f   f   o   o   o   o   o   o   q   q   q   q   q',
    'f   f   f   f   f   f   k   k   k   k   k   k   o   o   o   o   o   q',
    'F   F   F   m   m   m   kv  l<  l   l   l   l   l   l   n   n   o   q',
    'F   p   F   n   n   m   m   m   m>  n   n   n   n   n   n   nv  o   q',
    'F   p   F   n   n   n   n   n   n   n   q   q   q   q   q   q   ov  q',
    'F   pv  F   F   F   F   F   F   F   q<  q   z   B   B   B   q   q   q',
    'F   r<  r   r   r   s<  s   s   s   t<  t   z   B   w   w   w   w   u^',
    'F   F   F   F   F   F   v<  v   s   v   t   z   B   wv  x<  x   u   u',
    'y<  y   y   y   y   F   t   v   v   v   t   zv  B   B   B   B>  u   D^',
    'F<  F   F   F   F   F   t   t   t   t   t   u   u   u   u   u   u   D',
  ],
  { curls: true },
);
