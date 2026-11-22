import { levelFromMap } from './levelMap';

/** Level 277 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 27707, attempt 21), score 79 (Very hard). */
export default levelFromMap(
  277,
  [
    'U   R   R   A   A   A   A   A   A>  E   E   E   E   C   C>  E   E>  G^',
    'U   S   R   K   K   K   I<  I   K^  M   M   M>  E   E   E   E   O^  G',
    'U   S   R   K   P^  K   K   K   K   M   Z   Q<  Q   G   G   G   O   G',
    'U   S   Rv  S^  P   P   Y   Y   Y   M   Z   T^  Q   G   O   G   O   G',
    'U   S   S   S   U^  P   Y   M   M   M   Z   T   Q   G   O   O   O   G',
    'U   U   U   U   U   P   Y   V^  Z   Z   Z   Q   Q   G   G   G   G   G',
    'W^  e0  e0  X^  Y^  P   Y   V   Zv  a0< a0  a0  a0  a0  d0  c   c   c',
    'W   e0  e0  X   Y   Y   Y   V   V   V   h   h   b0^ c0^ d0  c   d0^ c',
    'W   e0v e0  X   X   X   X   e   e   V   h   b0  b0  c0  d0  c   d0  c',
    'W   a   d   d   d   d   X   e   X   V   h   h   f0^ c0  d0  d0  d0  c',
    'W   a   g0< g0  a^  d   X   e   X   V   b^  h   f0  c0  c<  c   c   c',
    'W   a   a   a   a   dv  X   ev  X   V   b   h   f0  c0  i   i   i   i',
    'W   j   j   j   j   j   X   X   X   V   b   h   f0  f0  i   f<  f   i',
    'W   j   W   W   W   W   l   l   l   l   b   h   .   f0  f0  f0  f   i',
    'W   j   W   n   n   W   l   g<  g   b   b   h   h>  g   g   f0  f0  i',
    'W   j   W   W   n   W   l   k   g   g   g   g   g   g   m   m   f0  iv',
    'W   j   j>  W   n   W   l   k   k   k   k>  l   l   l   l>  m   m>  N',
    'W   W   W   W   nv  W   l   l   l   l   l   l   u   N   N   N   N   N',
    'o^  p<  p   p   s   s   s   s   q<  q   q   q   u   N   r<  r   r   r',
    'o   o   o   s<  s   t<  t   s   u<  u   u   u   u   N   N   N   N   N',
    'v^  x   x   y   y   y   y   B   B   B   B   H   H   H   H   H   w^  N',
    'v   xv  y   y   D   D   yv  J   J   J   B   H   F   F   F   H   w   N',
    'v   y   y   z<  z   D   D   J   B<  B   B   H   F   F   F   H   w   N',
    'v   D<  D   D   z   z   D   J   L   L   L   L   F   F   F>  Hv  w   N',
    'v   v   v   D   D   D   D   J   J   J   J>  L   L   L   L   L   L>  Nv',
  ],
  { curls: true },
);
