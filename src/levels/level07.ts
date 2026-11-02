import { levelFromMap } from './levelMap';

/** Level 7 — chapter 1, normal level, generated from tools/level-plan.json (seed 750, attempt 4), score 46 (Medium). */
export default levelFromMap(
  7,
  [
    'a^ d  d  d  b  b  b> c',
    'a  d  f  d  e  g  g  c',
    'a  d  f  d  e  e> g  c',
    'a  dv f  f  f  f> gv c',
    'a  a  a  i  c< c  c  c',
    'h^ i< i  i  j  j  j  j>',
    'h  n  n  n> j  k  k  k>',
    'h  n  m  m  j  k  l  l',
    'h  n  o  mv j  k  k  lv',
    'h  n  o  o  o> p  p  p>',
  ],
  { revision: 6 },
);
