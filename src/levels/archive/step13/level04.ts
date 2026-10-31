import { levelFromMap } from '../../levelMap';

/** Level 4 as shipped in Step 13 (revision 4). Frozen copy for Daily League pool 4: never edit. */
export default levelFromMap(
  4,
  [
    '.  a  a  a  a  a  a>',
    '.  a  .  b< b  b  b',
    'd  a  c  c  c  c  c',
    'd  .  e  e  e  .  c',
    'd  .  e  .  e  c< c',
    'd  .  e  f  f  f  .',
    'd  d> ev fv .  f  .',
    '.  g  h  h  h  h  .',
    'g< g  hv i< i  i  i',
  ],
  { revision: 4 },
);
