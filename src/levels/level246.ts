import { levelFromMap } from './levelMap';

/** Level 246 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 24601, attempt 6), score 77 (Very hard). */
export default levelFromMap(
  246,
  [
    'A<  A   C<  C   C   C   C   C   C   E<  E   E   E   E   E   F<  F',
    'A   A   G<  G   G   G   G   H^  C   C   I   I   I   I>  E   E   F',
    'A   A   H   H   H   H   H   H   J^  C   I   K^  L<  L   M^  F   F',
    'J   Q   H   N   N   N   N   N>  J   C   I   K   I   L   M   M   M',
    'J   Q   H   N   J   J   J   J   J   C   I   I   I   L   O<  O   M',
    'J   Q   H   N   J   C   C   C   C   C   P<  P   T   L   L   O   M',
    'J   Q   H   Q^  J   P   P   P   P   R^  S^  P   T   T>  L   O   U^',
    'J   Q   Q   Q   J   P   V   V>  P   R   S   P   O   O   O   O   U',
    'J   J   J   J   J   P   V   V   P   P   P   P   O   U   U   U   U',
    'W^  X   X   X>  W   P   Y^  Y   Z^  a0  a0> Z   O   b0  b0  b0> O',
    'W   W   W   W   W   P   Y   Y   Z   Z   Z   Z   O   O   O   O   O',
    'P   P   P   P   P   P   a^  b   b   b>  u   j   j   j   j   f   m',
    'c^  a   a   a   a   a   a   b   d<  d   u   j   k   k   k   f   m',
    'c   a   e<  e   e   e   e   b   u   u   u   j   k   f^  k   f   m',
    'c   a   c   c   c   c   g<  g   u   h^  l   j   k   f   k   f   m',
    'c   a   c   g   g   c   i^  g   u   h   l   jv  kv  f   f   f   m',
    'c   a   c   g   i   i   i   g   u   h   l   l   l   l   l   l>  mv',
    'c   c   c   g   g   g   g   g   u   h   h   v   v   v   v   v   v',
    'n<  n   o^  u   u   u   u   u   u   p   h   v   w   t   x   r   r',
    'n   n   o   u   p<  p   q<  q   q   p   h   v   w   t   x   r   rv',
    'n   n   o   u   s^  p   p   p   p   p   h   v   w   tv  x   r   D',
    'n   n   o   uv  s   s   s   s   y   B   v<  v   w   w>  xv  r   D',
    'n   n   o   o   o   o   y^  s   y   B   z   z   z   z   z>  r   D',
    'o   o   o   o   o   o   y   y   y   B   B   B   B   B   B>  r   Dv',
  ],
  { curls: true },
);
