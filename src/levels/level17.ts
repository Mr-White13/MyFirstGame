import { levelFromMap } from './levelMap';

/** Level 17 — chapter 1, hard level, generated from tools/level-plan.json (seed 1750, attempt 3), score 66 (Hard). */
export default levelFromMap(
  17,
  [
    'a^ b< b  b  b  c< c  c  c  c',
    'a  d  d> e^ b  f^ k  k  k  k',
    'a  d  e  e  b  f  g< g  g  k',
    'h^ d  e  b  b  f  i^ j< j  kv',
    'h  h  e  r  r  f  i  i  j  p',
    'e  e  e  l^ r  f  f  f  j  p',
    'e  m  m> l  r  n  n> j  j  p',
    'e  m  l  l  r  n  o< o  o  pv',
    'r  r  r  r  r  n  y  q  q  q',
    'rv s< s  s  s  s  y  q  w  A',
    'x  t^ y  y  y  y  y  q  w  A',
    'x  t  y  u  v< v  u^ q  wv A',
    'x  t  y  u  u  u  u  q  q> A',
    'xv y< y  z< z  z  A< A  A  A',
  ],
  { revision: 4, tier: 'hard' },
);
