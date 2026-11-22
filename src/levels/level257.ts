import { levelFromMap } from './levelMap';

/** Level 257 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 25701, attempt 26), score 77 (Very hard). */
export default levelFromMap(
  257,
  [
    'Q< Q  Q  Q  Q  Q  R  R> S  S  S  S  S> U  U  U  U',
    'T< T  U< U  U  Q  R  Q  Q  U  U  U  U  U  a< a  a',
    'b^ T  b  c^ U  Q  R  R  Q  U  a  a  a  a  d  d> a',
    'b  b  b  c  U  Q  Q  Q  Q  U  a  e  e> a  d  f^ a',
    'c  c  c  c  U  U  U  U  U  U  a  e  l  a  d  f  a',
    'c  j  j  j  g< g  j  j  j  j  a  e  l  a  f  f  a',
    'h^ j  h  j  j  j  j  i< i  jv a  e  l  a  a  a  a',
    'h  h  h  k  k> m  m  m  m  m  m  e  l  l> e  e  e',
    'r  r  r  k  m  m  q  q  q  q  m  e  e  e  e  m^ e',
    'r  k  k  k  m  x  n< n  n  q  m  o^ p  p> o  m  e',
    'r  k  k  k  m  x  s  s  n  q  m  o  o  o  o  m  e',
    'r  k  k  k  m  x  s  n  n  qv m  m  m  m  m  m  e',
    'r  k  k  k  r^ x  s  s  s  s> e  e  e  e  e  e  e',
    'r  r  r  r  r  x  x  x  x  x  t^ u  u  u> t  t  t',
    'v^ w^ B  H  H  H  H  H  H  xv t  t  t  t  t  y^ z^',
    'v  w  B  H  D  D  D  y  y  y  y  A  A  A  A> y  z',
    'v  w  B  H  D  L  D  D  D  D  y  y  y  y  y  y  z',
    'v  B< B  H  D  L  C< C  N  D  D  D> E^ z  z  z  z',
    'M  M  M  H  D  L  I^ C  N  E  E  E  E  z  F< F  G^',
    'M  D  M  Hv D  L  I  C  N  E  P  P  P  P  P  F  G',
    'M  D  D  D  D  L  I  C  N  E  P  J  J  J  J^ F  G',
    'M  K^ L< L  L  L  C  C  N  E  P  J  J  J  J  J  G',
    'M  K  K  K  N  N  N  N  N  E  P  J  J  J  J  J  G',
    'M  M  M  M> Nv O  O  O  O> E  P  P  P  P  P  P> G',
  ],
  { curls: true },
);
