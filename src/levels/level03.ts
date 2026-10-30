import { levelFromMap } from './levelMap';

/** Level 3 — a ray crossed by two arrows: h needs both i and j out of its way. */
export default levelFromMap(3, [
  'j^ .  k  k  k> .  n^',
  'j  .  o  .  .  .  n',
  '.  .  ov .  .  l  .',
  'i  i  i> .  .  l  .',
  '.  p  p  p> .  lv .',
  'h^ .  .  .  .  .  .',
  'h  .  .  m  m  m  m>',
]);
