import { levelFromMap } from './levelMap';

/** Level 5 — chapter 1, normal level, generated from tools/level-plan.json (seed 550, attempt 1), score 43 (Medium). */
export default levelFromMap(
  5,
  [
    'a^ b< b  b  b  b  h',
    'a  c^ d< d  d  d  h',
    'a  c  e  e  e  e> h',
    'a  c  c  f  f  f  h',
    'a  a  a  fv g< g  hv',
    'i^ j< j  j  k  g  l',
    'i  m  n  j  kv g  l',
    'i  m  n  j  g  g  lv',
    'm< m  n  n  n  n  n>',
  ],
  { revision: 6 },
);
