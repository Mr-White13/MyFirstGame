import { levelFromMap } from './levelMap';

/** Level 2 — first bent arrows and a three-step chain (d → c → g). */
export default levelFromMap(2, [
  '.  .  .  .  .  .  .',
  'a  a  a> .  b^ .  .',
  'a  .  .  .  b  .  g',
  '.  .  .  .  b  .  gv',
  '.  d  .  .  c< c  c',
  '.  dv .  .  .  .  f',
  '.  .  .  e  e  e> fv',
]);
