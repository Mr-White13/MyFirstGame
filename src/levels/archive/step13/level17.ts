import { levelFromMap } from '../../levelMap';

/** Level 17 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  17,
  [
    'a^ b  b  b> .  .  c  c  c> d^ .',
    'a  e^ f< f  f  f  f  .  .  d  .',
    'a  e  g^ h^ i< i  i  i  i  d  d',
    'j^ e  g  h  l  l  l  .  i  .  .',
    'j  e  g  h  l  k^ l  .  i  i  .',
    'j  e  g  .  l  k  lv o  .  m^ s',
    'j  e  l  l  l  k  .  o  m  m  s',
    'j  .  n  n  n> .  .  ov p^ .  s',
    '.  q  q  .  .  p  p  p  p  .  s',
    '.  .  qv .  .  p  r  r  r  r> sv',
    't< t  t  t  t  p  .  u  u  u> .',
    '.  .  .  .  x  p  v  v  v> y  y',
    'w  w  .  .  x  p  .  .  .  y  .',
    '.  wv x< x  x  p  y< y  y  y  .',
  ],
  { revision: 2 },
);
