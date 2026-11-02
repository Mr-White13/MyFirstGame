import { levelFromMap } from './levelMap';

/** Level 11 — chapter 1, normal level, generated from tools/level-plan.json (seed 1150, attempt 2), score 50 (Medium–hard). */
export default levelFromMap(
  11,
  [
    'a  a  a> b  b  b  b  b>',
    'a  b  b  b  c^ d< d  d',
    'a  g  g  e^ c  c  f^ d',
    'a  gv i  e  e  e  f  d',
    'a  a  i  f  f  f  f  d',
    'h^ a  iv p  p  p  p  j^',
    'h  h  h  p  k< k  p  j',
    'm  m  n  p  l^ k  p  j',
    'mv n< n  p  l  l  l  j',
    'o< o  o  pv r  q< q  q',
    'r< r  r  r  r  s  s> q',
  ],
  { revision: 4 },
);
