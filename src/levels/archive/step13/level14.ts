import { levelFromMap } from '../../levelMap';

/** Level 14 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  14,
  [
    '.  .  .  .  a< a  a  b< b  c^',
    '.  .  g  f  d  m  m  m  b  c',
    'g  g  g  f  d  d  d> m  b  c',
    'g  e^ .  f  f> l  .  m  b  b',
    'gv e  e  e  e  l  h^ m  .  .',
    '.  i  i> .  .  l  h  m  j^ .',
    '.  i  k< k  k  l  h  m  j  .',
    'p  .  .  .  l< l  h  mv j  j',
    'p  h  h  h  h  h  h  .  .  n^',
    'p  .  .  s  o  o  o  o  o> n',
    'pv .  q^ s  .  .  r  r> .  n',
    '.  q  q  sv .  .  r  .  .  n',
    't  t  t  t  t> u  u  u  u> .',
  ],
  { revision: 2 },
);
