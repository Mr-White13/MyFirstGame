import { levelFromMap } from '../../levelMap';

/** Level 18 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  18,
  [
    '.  .  d  d  .  .  .  a  a  a> .',
    '.  .  .  d  b< b  b  b  b  b  .',
    'd  d  d  d  .  .  c  c  c> b  .',
    'dv e^ .  .  .  .  c  f^ .  b  .',
    'm  e  c  c  c  c  c  f  b  b  .',
    'm  e  c  .  .  .  .  f  .  g< g',
    'm  e  .  h< h  h  l  l  l  .  g',
    'm  .  i^ j< j  j  l  k^ l  .  g',
    'm  .  i  .  .  j  lv k  p  p  p',
    'mv .  i  n< n  n  n  k  p  r  p',
    '.  .  i  s  o< o  o  k  p  r  pv',
    't  t  i  s  q^ .  o  .  p  rv .',
    'v  t  i  sv q  x  o  .  p  .  .',
    'v  tv i  w  q  x  o  o  u< u  u',
    'vv w< w  w  q  xv y  y  y> .  u',
  ],
  { revision: 2 },
);
