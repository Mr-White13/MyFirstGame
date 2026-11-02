import { levelFromMap } from './levelMap';

/** Level 14 — chapter 1, normal level, generated from tools/level-plan.json (seed 1450, attempt 2), score 52 (Medium–hard). */
export default levelFromMap(
  14,
  [
    'a  a  a  a> b  b  b  b  b>',
    'a  g  c  c  c  c> h  h  h',
    'a  g  c  d  d  d> i  j  h',
    'a  g  c  d  e< e  i  j  h',
    'f^ g  c  c  c  c  i  j  h',
    'f  g  g  g> i  i  i  j  hv',
    'f  i< i  i  i  m  m  j  j>',
    'k^ l  l  l  l> p  m  q  t',
    'k  l  n  n  n  p  mv q  t',
    'k  l  nv o^ n  p  q  q  t',
    'k  k  k  o  o  pv qv s  t',
    'r< r  r  s< s  s  s  s  tv',
  ],
  { revision: 4 },
);
