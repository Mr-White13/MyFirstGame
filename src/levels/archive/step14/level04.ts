import { levelFromMap } from '../../levelMap';

/** Level 4 as shipped in Step 14 (revision 5). Frozen copy for Daily League pool 5: never edit. */
export default levelFromMap(
  4,
  [
    'g  a  a  a  a  a> b^',
    'g  a  c  c  c> b  b',
    'g  d< d  d  d  d  d',
    'g  g  g  e< e  e  d',
    'j  j  g  i  i  i  f^',
    'j  g< g  i  h^ i  f',
    'j  i< i  i  h  h  f',
    'j  l  l  l  l  l  f',
    'jv k  k  k  k> l  l>',
  ],
  { revision: 5 },
);
