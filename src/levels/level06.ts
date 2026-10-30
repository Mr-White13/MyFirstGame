import { levelFromMap } from './levelMap';

/** Level 6 — first 8×8 board; b has two blockers in a row on its way out. */
export default levelFromMap(6, [
  'a  a  a  a  a> .  b  .',
  'c  .  k  .  .  .  b  n',
  'c  .  kv .  .  f  bv n',
  'cv .  e  e  e> f  .  nv',
  'm  i  .  .  .  f  o  o>',
  'm  i  i  i> .  fv .  h',
  'mv .  .  g  g  g  g> h',
  'l< l  l  l  p  p  p> hv',
]);
