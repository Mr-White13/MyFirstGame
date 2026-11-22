import { levelFromMap } from './levelMap';

/** Level 268 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 26823, attempt 4), score 78 (Very hard). */
export default levelFromMap(
  268,
  [
    'A^  C<  C   C   C   C   C   E<  E   G   G   G   G>  E   E   E   E   S',
    'A   V   A   I^  K   K>  M^  O^  E   G   Q   Q   Q>  E   R^  S^  E   S',
    'A   V   A   I   K   T^  M   O   E   E   E   E   E   E   R   S   E   S',
    'A   V   A   I   K   T   M   O   U^  O   O   O   S   S   S   S   E   S',
    'A   Vv  A   I   K   T   M   O   U   U   U   O   S   E   E   E   E   S',
    'A   A   A   I   K   T   M   O   O   O   O   O   S   S   S   S   S   S',
    'I   I   I   I   K   K   M   M   W<  W   X<  X   X   X   X   X   X   Y^',
    'I   Z   Z   Z   Z>  K   K   K   a0^ W   W   W   W   W   W   W   X   Y',
    'I   Z   b0^ c0< c0  d0< d0  c0  a0  e0< e0  f0^ g0< g0  h0^ W   X   Y',
    'I   Z   b0  c   c0  c0  c0  c0  a0  a^  e0  f0  b^  g0  h0  W   X   Y',
    'I   Z   b0  c   c   c   c>  a0  a0  a   e0  f0  b   g0  h0  h0  X   Y',
    'd^  Z   b0  b0  a   e<  e   e   e   a   e0  f0  Y   Y   Y   Y   Y   Y',
    'd   f<  f   b0  a   a   a   a   a   a   e0  e0  Y   g<  g   g   g   g',
    'd   d   f   f   f   f   f   f   x   x   x   x   Y   Y   q   q   q   h^',
    'i<  i   i   i   i   x   x   x   x   j<  j   x   k   k>  q   l^  q   h',
    'm^  m   m   n^  x   x   n   n   n   n   j   x   k   q   q   l   q   h',
    'm   m   m   n   x   n   n   o<  o   n   j   x   k   k   s   q   q   h',
    'm   m   m   n   x   n   s   s   s   s   p   p   p   p>  s   qv  v   v',
    'r   r>  m   n   x   n   sv  t   t>  s   s   s   s   s   s   v   v   z',
    'm   m   m   n   x   n   w   w   w   u<  u   v<  v   v   v   v   z   z',
    'm   w<  w   n   xv  n   w   w   w   y^  u   y   y   z<  z   z   z   B^',
    'm   w   w   n   n   n   w   w   w   y   y   y   D^  N   N   N   N   B',
    'm   w   H   H   H   H   w   w   w   P   P   P   D   L   L   L   N   B',
    'm   w   F<  F   F   Hv  w   w   w   J   J>  P   D   L   D   Lv  Nv  B',
    'm   w   w   w   w   w   w   w   w   P<  P   P   D   D   D   B   B   B',
  ],
  { curls: true },
);
