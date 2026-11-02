import { levelFromMap } from './levelMap';

/** Level 13 — chapter 1, hard level, generated from tools/level-plan.json (seed 1350, attempt 1), score 62 (Hard). */
export default levelFromMap(
  13,
  [
    'a^ j  j  j  b^ c< c  d  d  e',
    'a  j  h  j  b  d< d  d  e< e',
    'a  j  h  j  b  f^ g< g  g  q',
    'a  h< h  j  b  f  i< i  g  q',
    'a  j< j  j  k^ f  l^ i  q  q',
    'k  k  k  k  k  f  l  l  q  m^',
    'n^ o< o  o  o  f  f  l  q  m',
    'n  p^ r  r  o  l  l  l  qv m',
    'n  p  r  o  o  r^ s^ t  t  t',
    'n  p  r  r  r  r  s  tv y  t',
    'u^ p  p  v< v  v  s  x  y  t',
    'u  w^ p  p  x< x  x  x  y  t',
    'u  w  w  w  w  y< y  y  y  t',
  ],
  { revision: 4, tier: 'hard' },
);
