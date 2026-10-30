import { levelFromMap } from './levelMap';

/** Level 5 — the original prototype board: only two free arrows and a crowded middle. */
export default levelFromMap(5, [
  'a  a  a> .  .  .  b^',
  'c  e  e  e  j  j> b',
  'c  f  f> ev .  i^ b',
  'cv f  .  .  i  i  m^',
  '.  h  .  g< g  g  m',
  '.  hv .  k< k  k  l^',
  'd< d  d  l  l  l  l',
]);
