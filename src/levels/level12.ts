import { levelFromMap } from './levelMap';

/** Level 12 — chapter 1, normal level, generated from tools/level-plan.json (seed 1250, attempt 0), score 50 (Medium–hard). */
export default levelFromMap(
  12,
  [
    'a< a  a  b^ c< c  c  c',
    'd  d  d> b  b  b  b  b',
    'd  e< e  e  e  f  f  b',
    'd  d  d  d  e  g  fv b',
    'e  e  e  e  e  g  g> b',
    'h  h  h  h  h> l  i  i>',
    'n  j< j  j  j  l  i  k^',
    'n  o  o  o  o  l  i  k',
    'n  o  p^ m  ov lv i  k',
    'n  o  p  m  i  i  i  m^',
    'nv o  p  m  m  m  m  m',
  ],
  { revision: 4 },
);
