import { levelFromMap } from '../../levelMap';

/** Level 19 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  19,
  [
    '.  a  a  a  a> b  b  b> c  c> h',
    'd  d  d  d  d  d> .  .  c  k  h',
    '.  .  f  e< e  e  .  g  g  k  h',
    '.  f< f  .  .  n  n  n  gv k  hv',
    'i< i  i  i  j^ n  .  n  .  kv .',
    'j  j  j  j  j  n  .  n  n  .  .',
    'j  q  l^ m^ n< n  .  .  .  .  .',
    'j  q  l  m  m  m  m  m  s  s  s',
    'j  q  l  .  p  .  .  m  s  o  o>',
    'j  q  p< p  p  m  m  m  s  o  .',
    '.  q  q  q  q  q> t  t  s  o  .',
    '.  .  r^ .  x  .  t  .  sv o  .',
    '.  .  r  r  x  .  t  t  t> o  v',
    'u< u  u  u  x  .  .  .  .  v< v',
    '.  w  w  w> x  x> y  y  y> .  .',
  ],
  { revision: 2 },
);
