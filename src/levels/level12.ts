import { levelFromMap } from './levelMap';

/** Level 12 — generated from tools/level-plan.json (seed 1250, attempt 3), score 57 (Medium–hard). */
export default levelFromMap(
  12,
  [
    'a  a  a  a> b  b  b  b  b>',
    'c< c  d  d  d> g^ h  h  h',
    'e^ c  d  f  f> g  g  g  hv',
    'e  c  c  f  m  m  m  m  m',
    'n  n  n  f  f  f  f  f  m',
    'n  i^ n  n  j< j  j  f  m',
    'n  i  l  l  l  l  l  f  m',
    'n  i  o< o  o  k  l  l> mv',
    'nv s  s  p  o  k  u  u  u',
    't  r  s  p  p> kv u  q^ u',
    't  r  s  s  s  s  s  q  u',
    't  r  r  r  r  r> sv q  u',
    't  t  t  t> q  q  q  q  uv',
  ],
  { revision: 3 },
);
