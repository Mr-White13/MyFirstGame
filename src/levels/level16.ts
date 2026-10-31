import { levelFromMap } from './levelMap';

/** Level 16 — generated from tools/level-plan.json (seed 1650, attempt 0), score 61 (Hard). */
export default levelFromMap(
  16,
  [
    'a< a  a  b^ c< c  c  c  c  d^',
    'e^ h^ a  b  f< f  f  f  c  d',
    'e  h  a  b  g  g> b  b  c  d',
    'h  h  a  b  b  b  b  i< i  i',
    'j^ k^ a  a  l  l  l  l  l> m^',
    'j  k  n^ a  o< o  o  o  s^ m',
    'j  k  n  a  p^ q  q  o  s  m',
    'j  k  n  p  p  q  o  o  s  m',
    'r< r  r  p  q< q  o  x  s  s',
    't< t  r  p  u^ v^ o  x  w< w',
    'y  t  r  p  u  v  o  x  u  w',
    'y  t  r  p  u  v  v  xv u  w',
    'y  y> r  r  u  u  u  u  u  w',
    'z< z  z  z  z  z  A< A  A  w',
  ],
  { revision: 3 },
);
