import { levelFromMap } from '../../levelMap';

/** Level 11 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  11,
  [
    '.  a< a  a  .  .  .  c  c',
    'h  h  h  b< b  b  b  .  cv',
    'h  d^ e  e  e> f^ b  g^ .',
    'hv d  i< i  f  f  .  g  .',
    '.  d  l  i  m  j^ k^ g  o',
    '.  d  l  i  m  j  k  g  o',
    '.  d  lv i  m  j  k  .  o',
    '.  d  d  i  mv .  .  n^ ov',
    'q  q  q  i  p  p  p> n  .',
    'qv .  r  i  p  .  n  n  .',
    'r< r  r  i  p  .  .  .  .',
    's  s  s> .  p  .  .  .  .',
  ],
  { revision: 2 },
);
