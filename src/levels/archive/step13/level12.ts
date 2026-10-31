import { levelFromMap } from '../../levelMap';

/** Level 12 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  12,
  [
    'a< a  b< b  b  c< c  c  c',
    '.  a  .  .  b  .  d  d  d>',
    'e  e> .  h  k  k  k  k  k',
    'e  .  .  h  .  f< f  f  k',
    'g< g  h< h  i^ j^ .  f  kv',
    '.  g  .  i  i  j  .  f  .',
    'j  j  j  j  j  j  p  p  q',
    'l^ .  m^ s  o  n< n  p  q',
    'l  .  m  s  o  .  n  p  q',
    'l  r  m  s  ov p^ n  p  qv',
    'l  r  r> s  .  p  p  p  .',
    'l  l  .  sv u  .  .  .  .',
    '.  t  t  t> u  u  u  u  u>',
  ],
  { revision: 2 },
);
