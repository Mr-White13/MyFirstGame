import { levelFromMap } from './levelMap';

/** Level 125 — chapter 7, one-life level (normal board, a single heart), long arrows, generated from tools/level-plan.json (seed 12500, attempt 33), score 73 (Very hard). */
export default levelFromMap(
  125,
  [
    'e  f  a  a  a  a  a> b  b  b  b  b  b  r',
    'e  f  b< b  b  b  b  b  c  c  c  c  b  r',
    'e  f  e  e  e  e  e  e  cv i  b  b  b  r',
    'e  f  e  t  t  d  d> e  e> i  i  i  i  r',
    'e  fv e  t  d  d  o  g^ h< h  h  h  iv r',
    'e  e  e  t  d  j^ o  g  r  r  r  r  r  r',
    'k^ p  p  t  t  j  o  g  r  v  l  l> s  s',
    'k  n  p  m^ t  j  o  g  r  v  l  u  u  s',
    'k  nv p  m  t  j  ov g  r  v  l  u  s  s',
    'k  p< p  m  t  q  q> g  rv v  l  u  sv z',
    'k  t< t  t  t  q  y  y  v  v  l  u  u> z',
    'k  k  x  x  x  q  q  y  vv w  w  w  w> z',
    'x^ k  x  A  A  A  y< y  z  z  z  z  z  z',
    'x  k  x  A  J  J  C  C  zv L  L  L  L  L',
    'x  x  x  A  H  J  C  D  F  F  F  F  F  L',
    'A  A  A  A  H  J  C  D  F  E  E  E  F  L',
    'Av B< B  G  H  J  Cv D  D  D> I  Ev Fv L',
    'G< G  G  G  Hv J  I< I  I  I  I  K  K  L',
    'J< J  J  J  J  J  K< K  K  K  K  K  L< L',
  ],
  { lives: 1 },
);
