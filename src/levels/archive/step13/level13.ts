import { levelFromMap } from '../../levelMap';

/** Level 13 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  13,
  [
    'a^ .  b^ c< c  .  d< d  d  .',
    'a  a  b  .  c  e  e  e  e  e>',
    'h  f^ b  .  c  g< g  g  j  l',
    'h  f  b  .  c  c  .  g  j  l',
    'hv f  .  p  i< i  i  .  jv l',
    '.  f  .  p  m  k^ n  n  n  lv',
    '.  .  .  p  m  k  n  .  n  .',
    'p  p  p  p  mv k  nv .  n  o',
    'p  .  .  .  u  o^ .  n  n  o',
    'pv q< q  q  u  o  o  o  o  o',
    '.  .  .  .  u  .  .  r< r  r',
    's  s  s> .  u  .  .  .  v  v',
    's  t  t  t> u  u  u  u  u> vv',
  ],
  { revision: 2 },
);
