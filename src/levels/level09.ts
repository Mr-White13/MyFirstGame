import { levelFromMap } from './levelMap';

/** Level 9 — generated from tools/level-plan.json (seed 950, attempt 1), score 54 (Medium–hard). */
export default levelFromMap(
  9,
  [
    'a^ b< b  b  b  b  c< c  c',
    'a  d^ e  e> k^ b  b  b  c',
    'a  d  e  h^ k  k  f^ g^ c',
    'a  d  d  h  h  k  f  g  c',
    'l  l  l  i< i  k  f  g  j^',
    'l  r  l  l  l  k  f  f  j',
    'lv r  n  n  n  n  n  f  j',
    'r  r  n  m  m> j  n  f  j',
    'r  q  n  m  o  j  j  j  j',
    'r  q  nv m  o  o  o  o> s',
    'r  q  q  q  p  p  p> q^ s',
    'r  r  r> q  q  q  q  q  sv',
  ],
  { revision: 5 },
);
