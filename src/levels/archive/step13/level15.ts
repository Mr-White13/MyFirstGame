import { levelFromMap } from '../../levelMap';

/** Level 15 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  15,
  [
    'a^ .  b  b> c  c  c  c> d^ .',
    'a  h  b  .  b  e< e  d  d  .',
    'a  h  b  .  b  .  e  .  f^ .',
    'g^ hv b  b  b  .  e  p  f  .',
    'g  .  .  i  i  i  i> p  f  .',
    'g  g  .  i  .  j^ l  p  f  .',
    '.  i  .  i  .  j  l  p  k^ .',
    'n  i  i  i  j  j  lv p  k  .',
    'n  .  .  m< m  m  .  p  k  .',
    'nv .  o< o  o  .  p< p  k  q',
    's  s  s  .  q^ r  r  r> .  q',
    's  .  s  .  q  q  q  q  q  q',
    'sv t  t  t> .  u  u  u> w  .',
    'v< v  v  v  v  v  v  .  w  w>',
  ],
  { revision: 2 },
);
