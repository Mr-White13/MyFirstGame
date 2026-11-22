import { levelFromMap } from './levelMap';

/** Level 211 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 21105, attempt 6), score 79 (Very hard). */
export default levelFromMap(
  211,
  [
    'u< u  u  u  u  u  v< v  v  v  v  v  w  w  w> v',
    'x  x  x  x  x> u  y  y> z  z  z> v  v  v  v  v',
    'x  A< A  u  u  u  y  B^ z  C  C> B  B  B  B  B',
    'x  D^ A  x  x  x  y  B  z  z  z  B  E< E  E  E',
    'x  D  A  x  y  x  y  B  B  B  B  B  F  F  F> E',
    'x  D  D  x  y  x  y  F  F  F  F  F  F  G  G> E',
    'x  x  x  x  y  x  y  y  y  G  G  G  G  G  J  E',
    'H< H  H  H  y  x  x  x  y  I^ J< J  J  J  J  E',
    'K  K> L^ H  y  y  y  y  y  I  I  I  M^ N^ E  E',
    'K  L  L  H  a  O< O  O  O  P< P  I  M  N  T  T',
    'K  Q^ Q  H  a  R^ S< S  S  S  P  I  M  N  c  Tv',
    'K  Q  Q  a< a  R  b  b  b  b> P  I  M  N  c  N',
    'K  R  R  R  R  R  b  I  I  I  I  I  M  N  cv N',
    'K  K  i  i  i  i  d^ e  e> f^ g^ M  M  N  N  N',
    'h^ K  iv d  d  d  d  e  f  f  g  M  j  j  j  j',
    'h  K  K  K  K  K  K  e  f  l  g  M  jv k  k> j',
    'q  q  q  q  q  q  K  e  l^ l  g  M  M  M  M  M',
    'q  m^ n  n> m  q  K  e  l  l  g  g  g  g  g  M',
    'q  m  m  m  m  q  K  e  e  t  t  t  t  t  t  M',
    'q  o^ q  q  q  q  K  K  K  t  p  p  p> s  t  M',
    'q  o  q  o  o  o  o  o  t  t  p  s  s  s  t  M',
    'qv o  o  o  r< r  r  o  o  o  s< s  t< t  t  M',
  ],
  { curls: true },
);
