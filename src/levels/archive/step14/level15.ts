import { levelFromMap } from '../../levelMap';

/** Level 15 as shipped in Step 14 (revision 3). Frozen copy for Daily League pool 5: never edit. */
export default levelFromMap(
  15,
  [
    'a< a  a  a  a  e  e  e  b^ f',
    'c< c  c  i^ a  e  g  e  b  f',
    'h  d^ c  i  a  a  g  ev b  fv',
    'h  d  d  i  i  i  g  g> b  k',
    'h  h  h  h  h> i  i  j  j  k',
    'm  m  m  p  p  p  p  jv q  kv',
    'm  l^ m  n< n  n  p  q  q  s',
    'mv l  m  m  m  n  p  q  v^ s',
    'o< o  o  p< p  p  p  qv v  s',
    'r  r  r  r> t  t  t  t  v  s',
    'r  y< y  y  y  y  z  t  v  sv',
    'r  w^ u  u  u  y  z  tv v  A',
    'r  w  u  x  uv y  z  z  v  A',
    'r  w  u  x  x> y  y  z  z> Av',
  ],
  { revision: 3 },
);
