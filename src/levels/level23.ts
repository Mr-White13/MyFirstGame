import { levelFromMap } from './levelMap';

/** Level 23 — generated from tools/level-plan.json (seed 2350, attempt 0), score 65 (Hard). */
export default levelFromMap(
  23,
  [
    'a^ b  b  b> c  c  c> d  d  d> e^ f^',
    'a  g  g  g  g> d  d  d  h^ p  e  f',
    'a  i^ j^ k< k  k  k  k  h  p  e  f',
    'a  i  j  j  j  l< l  k  h  p  e  f',
    'a  i  m  m  m  m> l  k  h  p  e  e',
    'n^ i  m  o  o> i  i  k  h  p  p> e',
    'n  i  i  i  i  i  q  q  q> t  t  e',
    'n  n  r^ x  x  s  s  s  s  s> tv e',
    'u^ v^ r  w^ x  x  x  x  x> G  G  G',
    'u  v  r  w  A  A  y  y  y  y  y> G',
    'u  v  r  w  z^ A  A  A  A  A> G  G',
    'u  v  r  r  z  z  B  B  B  B  G  J',
    'u  C< C  r  E  z  z  z  z  B  G  J',
    'H  H  C  r  E  F  F  F  B< B  G  J',
    'H  C  C  D^ Ev D  I  F  F  F> Gv J',
    'H  H  H> D  D  D  I  I  I  I  I> Jv',
  ],
  { revision: 3 },
);
