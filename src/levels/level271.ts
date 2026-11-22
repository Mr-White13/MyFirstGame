import { levelFromMap } from './levelMap';

/** Level 271 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 27123, attempt 5), score 79 (Very hard). */
export default levelFromMap(
  271,
  [
    'A<  A   A   A   A   A   T   C<  C   E^  G<  G   f0  f0  f0  I<  I   I',
    'K^  S   S   M<  M   M   T   T   C   E   N^  G   f0  U   U   U   U   I',
    'K   S   O^  P<  P   M   M   T   C   E   N   N   f0  U   Q<  Q   U   I',
    'K   S   O   d   d   d   d   T   C   E   E   E   f0  R   R>  Q   U   I',
    'K   Sv  d   d   c   c   d   T   C   T^  f0  f0  f0  R   Q   Q   Uv  I',
    'K   K   d   W   V^  c   d   T   C   T   f0  a   a   R   R   R   I   I',
    'd   d   d   Wv  V   c   d   T   T   T   f0  a   a   a   a   a   I   X^',
    'd   b0  b0  b0  V   c   d   Y   Y>  Z^  f0  h   h   a0  a0> a   I   X',
    'd   b0v e0  b0  V   c   d   Y   c0^ Z   f0  d0^ h   a0  f   a   I   X',
    'd   b   e0  e0  e0> c   d   Y   c0  Z   f0v d0  h   a0  f   av  I   X',
    'd   b   b   b   b>  c   d   Y   c0  Z   Z   d0  h   a0  f   X   I   X',
    'd   m   x   x   x   cv  dv  Y   c0  c0  Z   d0  h   a0  f   X   X   X',
    'e^  m   x   t   x   x   x   x   l   c0  Z   d0  h   h   f   f   f>  g^',
    'e   m   x   t   o   o   o   x   l   c0  Z   d0  d0  hv  g   g   g   g',
    'e   m   x   t   k   k   o   x   l   c0  Z   Z   Z   Z   j   i   i>  j^',
    'e   m   x   t   n   kv  o   x   lv  c0  p   p   p   Z   j   j   j   j',
    'e   mv  x   t   n   n>  ov  x   c0  c0  pv  r   r   Z   Z   Z   Z   Z',
    'x   x   x   t   t   t   t   x   x   x   q<  q   r   .   r   r   r   Z',
    'D   D   D   D   D   D   t   t   w   x   z   q   r   r   r   u   rv  Z',
    'D   s   s   s   s>  D   v   tv  w   x   z   q   q   q   q   u   u>  Z',
    'D   s   D   D   D   D   v   v>  wv  x   z   z   z   z   z   L   L   L',
    'D   s   D   B   B   B   B   B   B   xv  y<  y   y   L   zv  L   F   L',
    'D   s   D   Bv  D   D   D   D   B   B   B   B   y   L   L   L   F   L',
    'Dv  s   D   D   D   H   H   H   H   H   H   B   B   B   B   F<  F   L',
    'H<  H   H   H   H   H   J<  J   J   J   J   J   L<  L   L   L   L   L',
  ],
  { curls: true },
);
