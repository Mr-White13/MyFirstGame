import { levelFromMap } from './levelMap';

/** Level 145 — chapter 8, one-life level (normal board, a single heart), long arrows, generated from tools/level-plan.json (seed 14504, attempt 26), score 75 (Very hard). */
export default levelFromMap(
  145,
  [
    'g  g  g  a  a  a> c  n  b  b  b  b  b  b>',
    'g  c^ g  a  c  c  c  n  b  e  f  f  f  f',
    'g  c  a  a  c  d  d> n  b  e  e  e  e> fv',
    'gv c  c  c  c  d  h^ n  b  b  b  b  b  b',
    'd  d  d  d  d  d  h  n  i^ j< j  j  q  q',
    'd  l  l  l  l  n  n  n  i  k  k> j  z  q',
    'd  lv m< m  l  nv r  r  i  k  o^ j  z  q',
    'd  u  u  m  l  r  r  p^ i  o  o  j  z  qv',
    'd  u  m  m  l  rv w  p  s^ o  t^ j  z  z',
    'd  uv m  l  l  B  w  p  s  o  t  j  j  z',
    'C  C  C  C  C  B  w  p  s  o  t  y  j  z',
    'C  v  v> E  C  B  wv p  s  o  t  y  j  z',
    'C  E  E  E  C  B  p  p  s  o  t  y  j  z',
    'C  E  x< x  C  B  F  F  F  y< y  y  z< z',
    'C  E  A^ x  C  Bv F  G  L  L  L  L  L  L',
    'Cv E  A  x  C  C  F  G  L  D  D  D  D> L',
    'H  E  A  A  A  C  F  G  L  D  J  J  J  L',
    'H  E  E  E  E  E> Fv Gv L  D  J  D  D  L',
    'H  H  H  H  H> I  I  I> L  D  J  J> D  L',
    'K  K  K  K  K> I  L  L  L  D  D  D  D  Lv',
  ],
  { lives: 1 },
);
