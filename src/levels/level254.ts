import { levelFromMap } from './levelMap';

/** Level 254 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 25401, attempt 22), score 77 (Very hard). */
export default levelFromMap(
  254,
  [
    'a<  a   a   a   a   a   a   a   g   g   g   g   g   g   a   a   a',
    'l   l   m   m   h   h   h   a   g   e   e   e   e>  gv  a   K   K',
    'l   s   m   m   h   k   hv  a   g   e   i   i>  a   a   a   K   j^',
    'l   s   m   m   h   k   k>  a   a   a   a   a   a   K   K   K   j',
    'lv  s   m   m   h   n   n   n   n   n   q   q   q   K   u   u>  j',
    's   s   m   m   m   m   m   m   m>  nv  o^  t   q   K   u   j   j',
    's   p^  m   m   m   o   o   o   o   o   o   t   qv  K   u   r   r>',
    'sv  p   p   .   m   o   w   w   w   w   x   t   t>  K   u   r   v^',
    'y   y   p   p   p   o   wv  z   z   z   x   x   x>  K   K   r   v',
    'yv  B   B   B   p   o   D   D   D   z   z>  H   H   H   K   r   v',
    'B   B   M   Bv  p   o   D   C   D   D>  C^  H   H   H   K   r   r',
    'M   M   M   o   o   o   D   C   C   C   C   F^  H   H   K   A^  r',
    'M   N   N   N   N   N   F   F   F   F   F   F   H   H   K   A   r',
    'M   N   E^  L   L   N   G   G   G   G   H   H   H   Hv  K   K   r',
    'M   N   E   I   L   I^  G   J   J   J>  H   O   O   O   O   Kv  r',
    'M   N   E   I   Lv  I   G   U   U   U   H   O   r   r   r   r   r',
    'Mv  Nv  E   I   I   I   G   U   Z   U   H   O   O   O   O   O>  R',
    'T   U   U   U   U   G<  G   U   Z   Z   Z   Z   Z   Z   Q   Q   R',
    'T   U   S   S   U   U   U   U   X   d   d   d   d   Z   Q   c   R',
    'T   U   S   P<  P   S   S   S   X   d   Y   Y   d   Z   Qv  c   Rv',
    'T   U   S   S   S   S   W   S   X   d   Y   Y   d   Z   c   c   a0',
    'T   U   V   V   V   b   W   Sv  X   d   d   Y   d   Z   c   a0  a0',
    'Tv  Uv  Vv  b0  V   b   W   W>  X   X>  d   Yv  d   Zv  c   a0v f',
    'b0< b0  b0  b0  b<  b   d<  d   d   d   d   c<  c   c   c   f<  f',
  ],
  { curls: true },
);
