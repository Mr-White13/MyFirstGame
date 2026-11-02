import { levelFromMap } from '../../levelMap';

/** Level 20 as shipped in Step 14 (revision 3). Frozen copy for Daily League pool 5: never edit. */
export default levelFromMap(
  20,
  [
    'a  a  a> b  b  b> c  c  c  c  c>',
    'd< d  b  b  e  e  c  m  m  m  f^',
    'g^ d  k  k  k  e  c  h< h  m  f',
    'g  g  k  n  k  e  c  i^ h  m  f',
    'j^ g  k  n  kv e  l^ i  i  mv f',
    'j  g  k  n  e  e  l  l  i  f  f',
    'j  j  k  nv ev r  r  l  s  s  o^',
    'p^ j  q< q  q  q  rv l  y  s  o',
    'p  j  u  u  u  u  u> l  y  s  o',
    'j  j  u  v  v  v  l  l  y  sv o',
    't^ u  u  vv x  v  w  w> y  o  o',
    't  t  x< x  x  v  y< y  y  o  z^',
    'A^ t  C  C  C  v  B  B  B> o  z',
    'A  t  C  A  C  v  v  v  C  C> z',
    'A  A  A  A  C  C  C  C  C  z  z',
  ],
  { revision: 3 },
);
