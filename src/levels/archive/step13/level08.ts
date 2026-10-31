import { levelFromMap } from '../../levelMap';

/** Level 8 as shipped in Step 13 (revision 4). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  8,
  [
    'a< a  a  .  b< b  b  .',
    'd  d  d  d  .  .  c^ .',
    'dv e  e> d  .  c  c  f^',
    '.  e  .  d  h  h  g^ f',
    'j  j  j  d  hv g  g  f',
    'j  .  i  i  i  i  i> f',
    'jv .  k< k  k  .  .  f',
    'n  n  n  n  n  .  .  f',
    'o  o  o  .  n  .  l^ .',
    'o  .  m< m  n  n> l  .',
    'ov .  .  m  l  l  l  .',
  ],
  { revision: 4 },
);
