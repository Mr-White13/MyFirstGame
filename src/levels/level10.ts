import { levelFromMap } from './levelMap';

/** Level 10 — the finale: one free arrow at the start and a ten-step chain. */
export default levelFromMap(10, [
  '.  .  .  b  b  b  b  b> a^',
  'j  j  j  j> .  c^ p^ o  a',
  'j  l< l  l  l  c  p  o  a',
  'k^ d  d  d  d> c  p  o  m^',
  'k  i^ e^ s< s  c  p  o  m',
  'k  i  e  r  r  r> p  ov m',
  'k  i  e  f< f  f  f  .  m',
  'k  i  e  t  t> g^ q  q> m',
  'k  h  h  h  h> g  n  n> m',
]);
