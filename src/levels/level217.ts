import { levelFromMap } from './levelMap';

/** Level 217 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 21706, attempt 6), score 76 (Very hard). */
export default levelFromMap(
  217,
  [
    'g  g  g  g  g  g  g> l  l  l  h  h  h  h  h  h>',
    'g  u  l  l  l  l  l  l  i^ l  h  j^ j  j  j  j',
    'g  u  l  k< k  k  k  k  i  l  h  j  j  p  p  p',
    'g  u  lv m^ q  n< n  i  i  l  h  j  j  j  j  p',
    'g  u  u  m  q  o  n  i  i  l  h  j  j  j  j  p',
    'g  g  u  m  q  ov n  l  l  l  h  h  p< p  p  p',
    't  t  u  m  qv n  n  l  r< r  r  h  r  s< s  s',
    'E  tv uv m  m  m  m  l  v  v> r  r  r  w  w> s',
    'E  E  E  E  E  y  m  l  v  x  x  x  x> w  s  s',
    'y< y  y  C  E  y  z^ l  v  x  A  A  A> w  w  B^',
    'd  d  y  Cv E  y  z  l  v  D< D  D  D  D  w  B',
    'd  d  y  E< E  y  z  l  v  F^ G< G  G  B  B  B',
    'd  d  y  y  y  y  z  z  z  F  H  H> G  G  G  G',
    'd  d  I< I  I  I  I  I  I  F  H  H  H  H  J< J',
    'd  d  c  c  c  c  c  c  I  F  F  F  F  F  F  J',
    'd  d  d  d  f  f  O^ c  I  I  J  J  M  M  F  J',
    'd  d  d  d  f  b  O  c  K  I  L^ J  Mv N  F  J',
    'd  a  e  e  f  b  O  c  K  I  L  J  N< N  F  J',
    'd  a  e  e  f  b  O  c  Kv I  L  J  F  F  F  J',
    'd  a  e  e  f  b  O  c  c  I  L  J  P  P  P> J',
    'd  av e  e  f  b  b  b> cv I  I  J  J  J  J  J',
    'dv e< e  e  f  f  f  f  f  f> I  I  I  I  I  I',
  ],
  { curls: true },
);
