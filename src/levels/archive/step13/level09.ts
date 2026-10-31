import { levelFromMap } from '../../levelMap';

/** Level 9 as shipped in Step 13 (revision 4). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  9,
  [
    '.  .  a< a  a  .  .  b< b',
    'g  c< c  c  c  c  c  c  b',
    'g  .  d^ .  e  e  e  e  e',
    'g  .  d  .  e  .  .  .  f',
    'g  .  d  e< e  d  f< f  f',
    'gv .  d  d  d  d  .  i  i',
    'h< h  h  h  h  h  h  i  .',
    '.  .  .  .  .  i^ .  i  j^',
    'm  m  k  j  .  i  i  i  j',
    'm  k< k  j  j  j  j  j  j',
    'm  l  l  l> .  .  .  o  o',
    'm  m  m  m  m> n  n  n> ov',
  ],
  { revision: 4 },
);
