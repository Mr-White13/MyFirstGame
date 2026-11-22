import { levelFromMap } from './levelMap';

/** Level 242 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 24225, attempt 20), score 79 (Very hard). */
export default levelFromMap(
  242,
  [
    'A^  L   L   L   L   L   L   I   I   I   I   I   I   E   E   E   E',
    'A   L   C   C   C   C>  L   O   O   O   O   O   I   E   D   D>  Ev',
    'A   L   C   G   G   G   L   T   K   K   K   O   I   I   R   R   R',
    'A   L   F^  G   F   Gv  L   T   H   H>  K   O   J   I   I>  J^  R',
    'A   L   F   F   F   b   L   T   K<  K   K   O   J   J   J   J   R',
    'A   A   A   b   b   b   Lv  T   U   U   U   O   P   P   P   P   R',
    'M^  N^  M   b   e   W   T   T   U   V   O<  O   Pv  Q   Q>  P   R',
    'M   N   M   b   e   W   T   S   U   V   Z   Z   Z   Z   Z   R<  R',
    'M   N   M   b   e   W   T   Sv  U   V   Z   Y   Y   Y   Y   Y   Y',
    'M   N   M   b   e   W   T   T>  Uv  Vv  Z   Y   Y   Y   Y   Y   t',
    'M   M   M   b   e   W   W   W   W>  f   Z   X   X   X   X>  Yv  t',
    'h   h   h   b   e   e   i   a   f   f   Zv  a0< a0  a0  a0  a0  t',
    'h   r   h   b   d   e   i   av  f   c   c   c   l   l   l   a0  t',
    'r   r   h   bv  d   e   i   f   f   c   k   k   l   a0  a0  a0  t',
    'r   o   h   d   d   e   i   f   j   c   c>  k   l   t   t   t   t',
    'r   o   h   dv  e<  e   i   fv  j   g<  g   k   l   t   n   n   n',
    'r   o   h   h   h   h>  i   i>  j   j   j>  kv  lv  t   m   m>  nv',
    'r   o   o   o   o>  r   r   r   s   s   s   s   s   t   y   y   y',
    'r   r   r   r   r   r   q   r   s   p<  p   p   p   t   y   y   y',
    'q<  q   q   q   q   q   q   rv  s   s   s   s   s>  tv  y   y   y',
    'z   u   u   u   u   u>  B   B   B   B   B   B   y   y   y   y   y',
    'z   u   v<  v   v   B   B   w<  w   w   w   B   y   y   y   y   y',
    'z   u   u   u   u   B   x   x   x   x>  w   B   yv  y   y   y   y',
    'zv  B<  B   B   B   B   x   .   w   w   w   B   B   B   B   B   B',
  ],
  { curls: true },
);
