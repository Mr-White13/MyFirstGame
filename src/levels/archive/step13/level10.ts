import { levelFromMap } from '../../levelMap';

/** Level 10 as shipped in Step 13 (revision 4). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  10,
  [
    '.  a  a  a  a  a> c  c  .',
    'f  f  b  b> .  .  cv g  g',
    'd^ f  b  .  e  e  e> .  g',
    'd  fv b  .  .  .  .  .  gv',
    'd  .  b  b  b  k  i  i  i',
    'h  h  h  h> b  k  iv n  n',
    'h  l  .  j^ b  kv .  .  n',
    'h  l  l> j  .  m  m  m> nv',
    'h  .  .  j  .  m  o  o  o',
    'h  p  p  p  .  m  o  q  q',
    'h  .  .  p  .  m  ov .  q',
    'p< p  p  p  .  q< q  q  q',
  ],
  { revision: 4 },
);
