import { levelFromMap } from '../../levelMap';

/** Level 8 as shipped in Step 14 (revision 5). Frozen copy for Daily League pool 5: never edit. */
export default levelFromMap(
  8,
  [
    'a< a  a  a  a  b  b> c^',
    'e  e  e  e  a  b  c  c',
    'e  d^ f  e  e> b  b  j',
    'e  d  f  f  f> g^ b  j',
    'e  d  h^ i< i  g  b  jv',
    'd  d  h  h  i  g  b  r',
    'd  k< k  m^ i  g  b  r',
    'n  n  k  m  i  i  l^ r',
    'n  m  m  m  l  l  l  r',
    'nv o< o  o  l  p< p  r',
    'q  q  q  q  q  q  q> rv',
  ],
  { revision: 5 },
);
