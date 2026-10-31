import { levelFromMap } from '../../levelMap';

/** Level 21 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  21,
  [
    '.  .  d  d  d  g  a< a  a  a  a',
    '.  .  d  b< b  g  c< c  c  c  a',
    'd< d  d  .  b  g  e  e> .  c  a',
    '.  .  b  b  b  g  e  l  l  c  .',
    '.  .  b  f  f> g  .  l  i  c  .',
    'b  b  b  f  .  gv h^ l  i  i  i>',
    '.  .  .  f  j^ m  h  l  l  l  l',
    'k  k  k> f  j  m  h  .  .  .  lv',
    'k  f  f  f  j  m  .  n  n  n  .',
    'k  f  .  .  j  mv .  n  .  o  o',
    'k  k  k  .  j  .  .  nv .  ov .',
    '.  .  k  p  p  p  p> q  q> .  t',
    'u  u  k  v  v  v  r^ q  .  s  t',
    '.  u  .  v  .  v  r  q  s< s  tv',
    'u< u  v< v  .  v  r  .  w  w  w>',
  ],
  { revision: 2 },
);
