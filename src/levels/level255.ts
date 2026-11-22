import { levelFromMap } from './levelMap';

/** Level 255 — chapter 13, one-life level (normal board, a single heart), full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 25523, attempt 10), score 80 (Very hard). */
export default levelFromMap(
  255,
  [
    'A<  A   A   A   A   A   C^  D<  D   D   G   E   E   E   E   E   E>',
    'M   M   M   I   F^  A   C   C   G^  D   G   E   H^  J   K   K   K',
    'M   I^  M   I   F   A   O   C   G   G   G   E   H   J   J   J>  Kv',
    'M   I   I   I   F   A   O   C   L^  E   E   E   H   H   H   H   H',
    'Mv  F   F   F   F   A   O   C   L   E   H   H   N   N   N   N>  H',
    'R   R   R   R   A   A   O   C   L   E   O^  H   H   H   H   H   H',
    'R   P   P>  R   R   R   O   L   L   E   O   S   S   m   m   m   m',
    'R   P   Q<  Q   Q   Rv  O   O   O   O   O   S   S   S   S   S>  m',
    'R   P   P   P   T   T   T   T   T   T>  U^  S   V   V   V>  W^  m',
    'R   R   R   R   T   X   X>  b   b   b   U   S   V   W   W   W   m',
    'Z   Z   Z   R   T   Y   Y   b   Y^  b   U   S   S   W   W   W   m',
    'c   c   Z   R   T   a   Y   Y   Y   b   U   W   W   W   m   m   m',
    'c   Z<  Z   R   a0^ a   a   a   a>  bv  U   m   m   m   m   m   m',
    'c   c>  a0  a0  a0  U   U   U   U   U   U   m   m   m   m   m   m',
    'h   a0  a0  d   d>  U   j   j   j   j   j   e^  f   k   f^  x   m',
    'h   a0  g^  d   h^  U   i   i   i   i>  jv  e   f   kv  f   x   m',
    'h   g   g   d   h   U   i   t   t   e   e   e   f   f   f   x   m',
    'h   h   h   h   h   U   i   l^  t   e   o   o   o   p   p   x   mv',
    'U   U   U   U   U   U   i   l   t   e   o   n^  o   o>  p   x   x',
    'U   w   w   w   w   u   i   l   t   e   o   n   n   n   pv  q^  x',
    'U   w   r^  s<  s   u   t<  t   t   e   o   v   v   v   v   q   x',
    'U   w   r   r   r   u   u   u   u>  e   e   e   e   q   vv  q   x',
    'U   w   w   w   w   w>  y   y   z   z   z   z   e   q   q   q   xv',
    'U   y<  y   y   y   y   y   z<  z   B   B>  z   z   z   z   z   z',
  ],
  { lives: 1, curls: true },
);
