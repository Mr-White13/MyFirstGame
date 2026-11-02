import { levelFromMap } from './levelMap';

/** Level 50 — chapter 3, hard level, generated from tools/level-plan.json (seed 5050, attempt 2), score 76 (Very hard). */
export default levelFromMap(
  50,
  [
    'n  a  a> b  b  b> l  c  c  c  c  c  c> d^',
    'n  a  e  e> f^ g^ l  h  h  h  h> i^ d  d',
    'n  j^ e  k  f  g  l  h  v  v  v  i  i  i',
    'n  j  j  k  k> g  l  h  v  h  v  v  v  i',
    'n  n  l< l  l  l  l  h  h  h  s  s  v  i',
    'm^ n  n  n  n  n> o  o  o> t  t  s  v  p^',
    'm  q^ r  r  r> o  o  x  x  H  t  sv v  p',
    'm  q  r  w  w  w  w  u  x  H  tv z  v  p',
    'm  q  q  q  q  q  w  uv x  H  H  z  vv p',
    'm  m  m  m  m  q  wv x< x  y^ H  zv p  p',
    'A  A  A> B^ C^ q  D  D> y  y  H  J  p  E^',
    'F  F> B  B  C  q  D  G  G> M  Hv J  E  E',
    'F  I^ B  C  C  q  q  G  M  M  L  Jv E  K^',
    'F  I  I  I  I  I  M  M  M  N  L  L> E  K',
    'F  F  O  O  O  O  Mv N< N  N  E  E  E  K',
    'Q  O< O  P  P  P  P  P  X  X  Y  Y  Y  Y',
    'Q  S  P< P  R  R  R  P  X  Y  Y  V  V  Y',
    'Q  S  S  S  S  S  R  P  X  T  U  U  V  Y',
    'Qv R< R  R  R  Sv R  P  X  T  T> Uv Vv Y',
    'W< W  W  W  R  R  R  P  X  X  X  X  X> Yv',
  ],
  { tier: 'hard' },
);
