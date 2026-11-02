import { levelFromMap } from './levelMap';

/** Level 15 — chapter 1, normal level, generated from tools/level-plan.json (seed 1550, attempt 0), score 53 (Medium–hard). */
export default levelFromMap(
  15,
  [
    'a^ b  c  c  c  c  c> n  h',
    'a  b  c  d  d  d> e^ n  h',
    'b  b  c  d  g^ f^ e  n  h',
    'b  i  i  d  g  f  e  n  hv',
    'bv iv d  d  f  f  e  n  n',
    'f  f  f  f  f  e  e  j^ n',
    'l  l  l  m  j  j  j  j  n',
    'k  k> lv m  m  m  m  m> nv',
    'k  q  o  o  o  o> s  s  s',
    'k  q  q  r  r  r  r  r  s',
    'k  k  q  r  p< p  p  r  s',
    'q< q  q  r  r  r  p  rv sv',
  ],
  { revision: 4 },
);
