import { levelFromMap } from './levelMap';

/** Level 258 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 25801, attempt 13), score 78 (Very hard). */
export default levelFromMap(
  258,
  [
    'a   a   a   a   a>  e   e   e   e>  s   s   s   s   s   s   h^  j^',
    'a   q^  k<  k   k   e   l<  l   s   s   m   m   m>  n^  s   h   j',
    'a   q   q   q   k   e   j   l   s   m   m   p   p   n   s   h   j',
    'a   o   o>  q   k   e   j   l   s   j   j   j   pv  n   s   h   j',
    'a   q   q   q   k   e   j   l   l   j   r^  j   n   n   s   s>  j',
    'e   e   e   e   e   e   j   j   j   j   r   j   j   j   j   j   j',
    'I   I   I   t   t   t   t   t   t   t   t   t   t   t   t   t>  u^',
    'I   D   I   t   v^  w^  x   x   x   x>  F   F   G   G   G   G   u',
    'I   D   I   t   v   w   x   y<  y   y   B   F   G   z<  z   G   u',
    'I   D   I   t   v   w   B<  B   B   B   B   F   C   C   z   G   u',
    'I   Dv  I   t   v   w   A   A   A   A   A   Fv  C   C>  z   Gv  u',
    'Iv  t   t   t   v   w   Av  O   E   H^  A   u   u   u   u   u   u',
    't   t   v   v   v   w   w   O   E   H   A   N   N   N   N   N   J^',
    't   P   v   K^  L   L   w   O   E   E>  M   M   M   M>  w   Nv  J',
    't   P   v   K   Lv  K   w   Ov  M   M   M   w   w   w   w   Q   J',
    't   Pv  v   K   K   K   w   w   w   w   w   w   Q<  Q   Q   Q   J',
    't   v   v   R<  R   R   R   R   S<  S   S   S   c0  T<  T   T   T',
    't   t   g   b0  b0  c0  c0  c0  c0  c0  S   S   c0  Y   Y   V   U^',
    'g   g   g   b0  b0  c0  b   b   b   c0  c0  c0  c0  f   Y   Vv  U',
    'g   a0  a0  b0  b0  c0  b   d   d   d   d   d   d   f   Y   U   U',
    'g   a0  W^  b0  b0  c0  b   d   X   X   X   X>  d   f   Yv  U   Z^',
    'g   a0  W   a0^ b0  c0  b   d   X   i   i   i   d   f   U   U   Z',
    'g   a0  a0  a0  b0v c0v bv  d   X   i   X   i   dv  fv  U   c<  c',
    'g   g   g   g   g>  d   d   d   X   X   X   i   i   i   i   i   i>',
  ],
  { curls: true },
);
