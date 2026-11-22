import { levelFromMap } from './levelMap';

/** Level 262 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 26220, attempt 8), score 78 (Very hard). */
export default levelFromMap(
  262,
  [
    'A<  A   A   A   A   A   Q   Q   Q   Q   Q   Q   E   E   E   E>  Q   G^',
    'I   I   I   H   I^  A   Q   J   J   J   J>  Q   Q   Q   Q   Q   Q   G',
    'I   H<  H   H   I   A   Q   J   K   K   K   K>  L   L   L   L>  M^  G',
    'I   I   I   I   I   A   Q   J   K   J   J   N^  L   M   M   M   M   G',
    'A   A   A   A   A   A   Q   J   K   K   J   N   L   O^  P<  P   P   P',
    'A   T   T   T   Q<  Q   Q   J   J   J   J   N   L   O   O   S   S   P',
    'A   T   R^  T   R   R   W   W   W   c   c   N   L   S^  O   O   S   P',
    'A   Tv  R   R   R   X   W   d   W   W   c   N   N   S   S   S   S   U^',
    'A   V<  V   V   V   X   Wv  d   d   c   c   X   X>  Y^  U   U   U   U',
    'A   i   i   i   V   X   b   b   d   c   a   X   Y   Y   U   Z   Z   Z',
    'a0^ i   b0^ i   V   X   bv  d<  d   c   av  X   Y   Z^  U   U   U   Z',
    'a0  i   b0  i   V   X   c<  c   c   c   X   X   Y   Z   Z   Z   Z   Z',
    'a0  i   b0  V   V   X   X   X   X   X   X   e^  Y   Y   Y   Y   Y   Y',
    'a0  i   b0  b0  f<  f   f   f   f   f   e   e   p   p   h   h   h   h',
    'a0  i   i   k   k   k   k   g<  g   f   e   o   o   p   h   n   n   hv',
    'a0  a0  iv  k   w   w   w   w   g   f   e   o   m   p   h   h   n   r',
    'j^  a0  k<  k   w   s   l<  l   g   f   e   o   mv  p   n<  n   n   r',
    'j   a0  j   j   w   s   l   l   g   f   e   o   o>  p   p   p   p>  r',
    'j   a0  j   w   w   s   s   s   g   q^  e   e   e   r<  r   r   r   r',
    'j   a0  j   w   x   x   u   s   g   q   q   q   e   e   e   e   e   e',
    'j   a0  j   w   t   x   u   s   s   s   s>  C   C   C   B   B   F   e',
    'j   j   j   w   tv  x   u   u>  x   x   x   x   D   C   B   B   F   e',
    'v^  v   v   w   w>  x   x   x   x   y   z   xv  D   C   B   B   F   e',
    'v   v   v   v   D   D   D   y<  y   y   zv  D   D   C   B<  B   F   e',
    'v   v   v   v   Dv  .   D   D   D   D   D   D   C<  C   F<  F   F   e',
  ],
  { curls: true },
);
