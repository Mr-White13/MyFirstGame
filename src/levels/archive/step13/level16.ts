import { levelFromMap } from '../../levelMap';

/** Level 16 as shipped in Step 13 (revision 2). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  16,
  [
    '.  .  c  .  a  a  a  a  a> b^',
    'c^ .  c  g  g  d  d  d> e^ b',
    'c  c  c  .  g  f^ e  e  e  b',
    '.  k  k  k  g  f  e  .  i  i',
    '.  k  .  k  gv f  h^ .  .  i',
    'j  j  j  k  f  f  h  i< i  i',
    'j  m  jv kv .  l^ h  .  .  h',
    'j  m  m> l  l  l  h  h  h  h',
    'j  n  n  n  n> o  o  o  o> .',
    'j  .  .  .  p< p  p  p  q^ .',
    'j  .  .  .  r  r  r> .  q  .',
    's  s  s  s  q  q  q  q  q  .',
    'sv .  .  .  q  t< t  .  .  u^',
    '.  .  .  .  q  q  t  .  u  u',
  ],
  { revision: 2 },
);
