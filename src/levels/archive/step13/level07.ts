import { levelFromMap } from '../../levelMap';

/** Level 7 as shipped in Step 13 (revision 4). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  7,
  [
    'b  g  g  .  a< a  a  a',
    'b  g  .  .  .  .  f  .',
    'bv g  .  .  f  f  f  .',
    '.  g  .  c^ f  d  d> e^',
    '.  g  .  c  fv d  .  e',
    'j  gv h^ c  .  d  .  e',
    'j  k  h  i^ .  d  e  e',
    'jv k  h  i  i  d  d  d',
    '.  kv h  h  h  l  l  l>',
    'n  n  m  .  h  .  .  m^',
    '.  nv m  m  m  m  m  m',
  ],
  { revision: 4 },
);
