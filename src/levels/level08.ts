import { levelFromMap } from './levelMap';

/** Level 8 — a seven-step chain snakes from the bottom right to the top left. */
export default levelFromMap(8, [
  '.  .  e  .  o  o  o> p^',
  '.  i  e  f< f  .  .  p',
  'i< i  ev .  .  g^ .  m',
  '.  d  d  d> c  g  q^ m',
  'j^ .  .  l^ c  g  q  mv',
  'j  .  .  l  c  n  n> a',
  'j  .  k  l  cv .  .  a',
  'j  k< k  b  b  b  b> av',
]);
