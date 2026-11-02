import { levelFromMap } from './levelMap';

/** Level 24 — chapter 2, normal level, generated from tools/level-plan.json (seed 2450, attempt 3), score 61 (Hard). */
export default levelFromMap(
  24,
  [
    'a^ b< b  b  b  c  c  c> g  i',
    'a  d  e  f^ b  b  b  b  g  i',
    'a  d  e  f  f  f  f  f  g  i',
    'a  dv e  e  e  e  e> f  gv i',
    'a  a  a  h  h  h  i< i  i  i',
    'j  j> a  k  k> h  h  h  h  h',
    'j  k  k  k  n  l  m  m  m> hv',
    'j  j  n< n  n  l  l  t  t  t',
    'r^ o< o  o  o  o  lv t  u  t',
    'r  p< p  p  p  q  q> t  u  t',
    'r  w< w  s  p  q  t  t  u  t',
    'v  v> w  s  p  q  t  s^ u  tv',
    'v  w  w  s  q  q  s  s  u  u>',
    'v  w  .  s  s  s  s  x  x  x>',
  ],
  { revision: 4 },
);
