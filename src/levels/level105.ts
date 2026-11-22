import { levelFromMap } from './levelMap';

/** Level 105 — chapter 6, one-life level (normal board, a single heart), long arrows, generated from tools/level-plan.json (seed 10500, attempt 27), score 71 (Very hard). */
export default levelFromMap(
  105,
  [
    'a  a  a  a  a  a  b  b  b  b  b  b  j',
    'k  k  k  k  k  a  b  e  e  h  h  h  j',
    'k  t  t  t  a< a  bv e  c  h  c^ h  j',
    'k  t  d^ t  i  i  e< e  c  c  c  h  j',
    'k  t  d  t  i  f^ g  g  g  g> f  hv j',
    'k  t  d  t  iv f  f  f  f  f  f  j< j',
    'kv t  d  t  t  d  l  l  l> m  m  m  m>',
    't  t  d  d  d  d  l  n^ u  s  s  s  o^',
    't  p< p  q^ w  r^ l  n  u  sv E  s  o',
    'tv v  p  q  w  r  l  l  u  A  E  E  o',
    'G  v  p  q  w  r  x  x  uv A  y  E  o',
    'G  v  p  q  w  r  r  x  H  A  y  E  E',
    'G  vv p  q  w  w  w> xv H  A  y  y> E',
    'G  p  p  q  q  z< z  H  H  A  A  A> E',
    'G  p  B  B> q  q  z  H  E  E  E  E  E',
    'G  G  B  z  z  z  z  H  E  D  C  C> D^',
    'F  G  B  B  B  B  B  H  Ev D  D  D  D',
    'Fv G  G  G  G  G  G> H  H  H  H  H  H>',
  ],
  { lives: 1 },
);
