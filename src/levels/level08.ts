import { levelFromMap } from './levelMap';

/** Level 8 — chapter 1, normal level, generated from tools/level-plan.json (seed 850, attempt 2), score 47 (Medium). */
export default levelFromMap(
  8,
  [
    'a< a  a  b  b  b  b  b>',
    'g  g  b  b  c^ d< d  d',
    'g  b  b  e^ c  h  h  d',
    'g  c  e  e  c  h  f^ d',
    'gv c  c  c  c  h  f  d',
    'l  j  j  j  j  hv f  d',
    'l  i  i  i> j  m  f  f',
    'l  i  k  k  jv m  n  f',
    'l  i  i  k  k> m  n  f',
    'lv m< m  m  m  m  n  n>',
  ],
  { revision: 6 },
);
