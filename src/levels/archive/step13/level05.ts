import { levelFromMap } from '../../levelMap';

/** Level 5 as shipped in Step 13 (revision 4). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  5,
  [
    'a< a  b< b  b  b  .',
    '.  a  e  e  e  e  .',
    'f  a  .  .  .  e  c^',
    'f  d^ .  .  e< e  c',
    'fv d  i  i  i  .  c',
    '.  d  i  h  h  h  h',
    'd  d  i  h  .  .  h',
    '.  j  i  .  g  g> hv',
    '.  j  i  i> g  j^ .',
    '.  j  j  j  j  j  .',
  ],
  { revision: 4 },
);
