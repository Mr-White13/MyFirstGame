import { levelFromMap } from './levelMap';

/** Level 1 — tutorial. Three arrows are free; two are each blocked by one of them. */
export default levelFromMap(1, [
  '.  .  .  .  .  .  .',
  '.  a  a  a> .  b^ .',
  '.  .  .  .  .  b  .',
  '.  .  .  .  e  .  .',
  '.  c  .  .  ev .  .',
  '.  c  .  d  d  d> .',
  '.  cv .  .  .  .  .',
]);
