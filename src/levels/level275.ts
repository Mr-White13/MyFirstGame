import { levelFromMap } from './levelMap';

/** Level 275 — chapter 14, one-life level (normal board, a single heart), full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 27503, attempt 15), score 81 (Very hard). */
export default levelFromMap(
  275,
  [
    'A<  A   A   A   A   A   Q   Q   X   g   S   S   S   S   S   S   C<  C',
    'E<  E   E   E   G^  I^  Q   K^  X   g   S   S   S   S   S   S   M^  C',
    'O^  P<  P   E   G   I   Qv  K   X   g   S   U   U   U   M   M   M   C',
    'O   R^  P   P   G   I   Y   K   X   g   Sv  T   T>  Uv  Z   Z   Z   C',
    'O   R   c0  P   G   I   Y   Y   X   g   V<  V   V   V   V   V   Z   C',
    'O   R   c0  W^  G   I   I   Y   Xv  g   g   V   V   V   V   V   Z   C',
    'O   R   c0  W   G   I   I   Yv  d0  d0  g   V   V   V   C   C   Zv  C',
    'O   R   c0  W   G   G   G   G   d0  g   g   a0< a0  b0  b0> C   C   C',
    'R   R   c0v W   W   W   d0< d0  d0  g   a0  e0^ a0  b0  c   c   c   a',
    'R   f0< f0  g0  g0  g0  g0  g0  g0  g   a0  e0  a0  b0  b0  b   c   a',
    'R   R   f0  g0  g0  g0  g0  g0  g0  g   a0  e0  a0  a0  b0  b   c   a',
    'd   R   f0  g0  g0  g0  g0  g0  g0v g   a0  e0  e0  a0  b0  b   c   av',
    'd   R   f0  f   f   f   f   g   g   g   a0  a0  a0  a0  b0  bv  cv  i',
    'dv  R   f0  f   e<  e   fv  gv  h<  h   h   h   h   h   b0  i<  i   i',
    'R   R   f0  f0  m   m   m   m   m   h   h   h   h   h   b0  b0  b0  b0',
    'p   p   p   f0  m   k   k   k   m   h   h   h   o   o   o   o   o   o',
    'p   j^  f0  f0  k   k   l   kv  m   n   n   n   o   u   u   x   x   x',
    'p   j   f0  l<  l   l   l   m<  m   nv  z   n   o   o>  u   x   F   F',
    'p   p>  f0  q   q   q   z   z   z   z   z   t   t   u   u   x   F   F',
    'f0  f0  f0  q   H   qv  z   s   s   w   w   t   u   u   r^  x   F   F',
    'f0  v   v   v   H   H   z   sv  w   w   t<  t   uv  r   r   x   F   F',
    'f0  vv  y   y   y   H   z   w<  w   D   D   D   D   D   D   x   x>  F',
    'f0  y<  y   y   y   H   z   z   z>  D   B   B   B   B>  D   D   D>  Fv',
    'f0  H<  H   H   H   H   J<  J   J   D   D   D   D   J   J   J   J   J',
    'f0  L<  L   L   L   L   L   L   J   J   J   J   J   J   N<  N   N   N',
  ],
  { lives: 1, curls: true },
);
