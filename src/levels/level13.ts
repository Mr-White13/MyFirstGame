import { levelFromMap } from './levelMap';

/** Level 13 — generated from tools/level-plan.json (seed 1350, attempt 0), score 57 (Medium–hard). */
export default levelFromMap(
  13,
  [
    'a^ b  b> c  c  c> d^ g  g  g',
    'a  b  f  e  e  e> d  d  d  g',
    'a  b  f  e  m  m  m  m  m  g',
    'a  b  fv e  m  l  l  l  m  g',
    'a  a  p  e  n  n  k  l  m  gv',
    'h^ i^ p  e  j^ n  kv lv m  m>',
    'h  i  p  j  j  n  n  n  n  n',
    'i  i  p  p  p  p  p  x  x  nv',
    'i  o  s  s  s  s  p  p> x  x',
    'i  o  s  q  q  q> r  r  r> x',
    'i  o  s  s  s  s> w  w  w  x',
    't^ ov u  u  u  u  u  u> w  x',
    't  t  u  v< v  v  v  v  wv xv',
  ],
  { revision: 3 },
);
