import { levelFromMap } from './levelMap';

/** Level 208 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 20821, attempt 25), score 78 (Very hard). */
export default levelFromMap(
  208,
  [
    'y  y  y> z  z  z  z  z  z> J  A  A  A  A  A  A>',
    'y  B  B> z  I  I  I  I  I  J  A  D  D  D  C^ D^',
    'y  B  H  z  I  E^ F< F  I  J  A  A  A  D  C  D',
    'y  B  H  z  I  E  E  F  F  J  J  G^ A  D  C  D',
    'H^ B  H  z  I  I  I> W  W  W  Jv G  A  D  C  D',
    'H  H  H  z  z  z  z  z  z  W  W  G  G  D  C  D',
    'K  K  K  K  K> L  L  L  L> M^ W  N^ G  D  D  D',
    'O^ P< P  P  Q  Q  Q> R  R> M  W  N  G  G  G  G',
    'O  O  O  O  Q  h  h  R  S^ M  W  N  T^ U< U  G',
    'Q  Q  Q  Q  Q  V^ h  R  S  M  W  N  T  T  U  G',
    'a  a  a  a  a  V  h  R  R  M  Wv N  X^ T  U  G',
    'a  d  e  e  av V  h  N  N  N  N  N  X  T  b^ G',
    'c^ d  d^ e  V  V  h  h  h  h  h  h  X  T  b  G',
    'c  d  d  ev V  f^ g< g  g  f  i  h  X  T  b  G',
    'c  c  c  c  V  f  f  f  f  f  i  hv i^ j^ b  G',
    'm  m  m  m  V  k^ l^ n  n  p  i  i  i  j  j  G',
    'm  r  r  m  V  k  l  l  n  p  p  u  u  u  j  G',
    'm  r  q  mv V  k  k  n< n  o^ p  u  j  j  j  p^',
    'm  r  q  q  q  q> w  w  o  o  p  u  j  v  v  p',
    'm  r  r> s  s  s^ t^ w  x  x  p  u  j  j  v  p',
    'm  m  m  s  s  s  t  w  x  x  p  u  u  u> vv p',
    's  s  s  s  s  s  t  wv x  x> p  p  p  p  p  p',
  ],
  { curls: true },
);
