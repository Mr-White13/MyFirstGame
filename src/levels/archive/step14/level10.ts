import { levelFromMap } from '../../levelMap';

/** Level 10 as shipped in Step 14 (revision 5). Frozen copy for Daily League pool 5: never edit. */
export default levelFromMap(
  10,
  [
    'a  a  a  a> b  b  b> c  d',
    'e  e  e  e  e  f  c< c  d',
    'g  g  g  i^ e  f  f  f  d',
    'h  h> g  i  e  e  e> fv d',
    'g< g  g  i  i  i  i  d  d',
    'o  o  o  j< j  j  j  dv j',
    'o  k^ l  l  k  k  j  j  j',
    'o  k  l  k  k  q  q  q  m^',
    'o  k  lv k  r  q  n^ q  m',
    'ov k  k  k  r  q  n  q  m',
    'p< p  p  p  r  qv n  q  m',
    'r< r  r  r  r  s< s  s  s',
  ],
  { revision: 5 },
);
