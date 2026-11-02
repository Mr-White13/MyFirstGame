import { levelFromMap } from '../../levelMap';

/** Level 6 as shipped in Step 14 (revision 5). Frozen copy for Daily League pool 5: never edit. */
export default levelFromMap(
  6,
  [
    'e^ l^ a< a  a  a  b< b',
    'e  l  c< c  c  c  c  b',
    'e  l  g< g  g  g  c  d^',
    'e  l  f  f  f> g  c  d',
    'l  l  f  i  i  g  c  d',
    'l  h  h  i  g  g  d  d',
    'l  hv k  i  i  i> d  j',
    'l  n  k  k  k  k> d  j',
    'l  n  n  n  n  n  d  j',
    'm  m  m  m  m> n  n> jv',
  ],
  { revision: 5 },
);
