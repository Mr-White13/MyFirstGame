import { levelFromMap } from './levelMap';

/** Level 185 — chapter 10, one-life level (normal board, a single heart), long arrows, generated from tools/level-plan.json (seed 18551, attempt 30), score 76 (Very hard). */
export default levelFromMap(
  185,
  [
    'a  a  a  a  a> b  b  b  b  b> s  s  s  s  c^',
    'd^ w  w  w  w  b  e< e  e  e  s  f  f> s  c',
    'd  g  g  g  w  b  b  b  b  b  s  f  k  s  c',
    'd  gv h< h  w  w  w  w  w  b  s  f  k  s  c',
    'd  d  i^ h  h  h  h  j^ w  b  s  k< k  s  c',
    'l^ d  i  q  q  q  h  j  w  m^ s  s  c  c  c',
    'l  d  i  q  p  j  h  j  w  m  m  s  u  u  n^',
    'l  d  i  q  p  j  j  j  w  o^ m  s  s  u  n',
    'l  d  i  q  p  p> r  w  w  o  m  z  s  u  n',
    'd  d  i  qv r< r  r  w  m  o  m  z  sv u  n',
    'd  t< t  t  t  t  t  w  m  o  m  z  n  uv n',
    'd  v  v  v  v  v> t  wv m  m  m  z  n  n  n',
    'd  t  t  t  t  t  t  B  B  B  x^ z  y  y> z^',
    'd  A  A  A  A  A  A> B  F  Bv x  z  z  z  z',
    'd  d  E  E  G  G  G  B  F  F  x  M  M  M  C^',
    'D^ d  d  E  G  H  G  B  B  F  x  M  K  M  C',
    'D  J  D  Ev G  H  G  F< F  F  x  M  K  C  C',
    'D  J  D  G< G  H  H  H> P  P  P  M  K  C  I^',
    'D  Jv D  L  P  P  P  P  P  O  P  M  Kv C  I',
    'D  D  D  L  L  L  L  L  L> O  P  M  M  M> I',
    'N< N  N  N  O< O  O  O  O  O  P  P  P  P> I',
  ],
  { lives: 1 },
);
