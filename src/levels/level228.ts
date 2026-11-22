import { levelFromMap } from './levelMap';

/** Level 228 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 22805, attempt 27), score 80 (Very hard). */
export default levelFromMap(
  228,
  [
    'H   H   H   H   H   A<  A   A   A   C<  C   C   C   C   D<  D   D',
    'c   P   P   E^  H   H   F^  K   K   K   K   K   G<  G   G   G   D',
    'c   L   P   E   J   Hv  F   K   F   F   .   K   I   I>  X   G   D',
    'c   L   P   J<  J   M   F   Kv  F   N   N   N   I   X   X   G   D',
    'c   Lv  P   M<  M   M   F   F   F   T   T   Nv  I   X   O^  G   D',
    'c   P<  P   c   c   c   Q<  Q   Q   Q   T   T   I   X   O   R^  D',
    'c   c   c   c   S^  c   c   c   d   Q   Q   Tv  I   X   O   R   U^',
    'W   Z   V   V>  S   b   b   c   d   I   I   I   I   X   O   R   U',
    'W   Z   V   a0  S   a   b   c   d   X   X   X   X   X   O   R   U',
    'Wv  Z   V   a0  S   a   b   c   d   Xv  Y<  Y   Y   Y   Y   R   U',
    'Z<  Z   V   a0v S   av  bv  cv  d   d   d   d   d>  f   f   f   U',
    'i   i   e^  S   S   x   x   x   x   j   j   k   h   fv  g<  g   U',
    'i   i   e   e   e   x   j   j   j   j   k   k   h   h   h   h>  U',
    'iv  i   i   i   i   x   jv  k<  k   k   k   t   t   t   t   t   t',
    'l   i   i   i   i   x   m   m   m   m   p   t   q   q   q   q   t',
    'l   l   l   l   l>  x   mv  o   o   m   p   t   q   t   t   q   t',
    'x   x   x   x   x   x   n   n>  o   o>  p   t   q   q   t   q   t',
    'x   v   v   p<  p   p   n   s   .   n   p   t   t   t   t   qv  t',
    'x   v   u   u   r^  p   n   s   s>  n   p   B   B   B   B   B   tv',
    'x   v   r   uv  r   p   n   n   n   n   p   B   w   w   w   B   B',
    'x   vv  r   r   r   p   p   p   p   p   p   B   w   y   w   w>  B',
    'x   x   x   x   x>  z   z   z   z   z   z   B   w   y   y   y>  B',
    'z<  z   z   z   z   z   B<  B   B   B   B   B   w   B   B   B   B',
  ],
  { curls: true },
);
