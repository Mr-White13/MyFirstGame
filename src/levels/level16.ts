import { levelFromMap } from './levelMap';

/** Level 16 — chapter 1, normal level, generated from tools/level-plan.json (seed 1650, attempt 1), score 55 (Medium–hard). */
export default levelFromMap(
  16,
  [
    'a  a> b^ c^ d  d  d  d  d>',
    'b  b  b  c  d  i< i  f< f',
    'b  e< e  c  d  c  i  h^ f',
    'g  g> e  c  d  c  i  h  h',
    'g  e  e  c  c  c  i  j  s^',
    'g  k  k  k  m< m  j< j  s',
    'n  n  n  k  l^ m  m  s  s',
    'n  p  n  k  l  r  r  s  o',
    'p  p  n  k  l  l  r  s  o',
    'p  n  n  k  k  k  r  s  ov',
    'pv nv q  q  q> kv rv s  s',
    'q  q  q  t  t  t  t  t  t>',
  ],
  { revision: 4 },
);
