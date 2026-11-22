import { levelFromMap } from './levelMap';

/** Level 243 — chapter 13, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 24306, attempt 9), score 79 (Very hard). */
export default levelFromMap(
  243,
  [
    'A^ B< B  B  B  B  B  G  C< C  C  C  C  E  E  I  I',
    'A  B  B  B  B  B  B  G  D  D  D  D> C  E  E  E> I',
    'A  B  G  G  G  G  G  G  D  F< F  O  C  E  I  I  I',
    'A  B  Gv H< H  H  H  H  D  D  F  O  C  E  Iv K  K',
    'A  B  B  B  L  L  L  H  J^ F  F  O  C  E  Y  Y  K',
    'A  A  A  B  L  M  L  H  J  F  O  O  E  E  Y  K< K',
    'c  c  A  B  Lv Mv L  H  J  F  O  P  P  P  Y  Y  Y',
    'Q  c  A  N^ H  H  H  H  F  F  O  P  S  P  V  V  Y',
    'Q  c  A  N  H  O< O  O  O  O  O  Pv S  P  U  V  Y',
    'Qv c  A  N  N  N  N  S  S  S  S  S  S  U  U  V  Y',
    'c  c  A  R^ a  a  N  Sv T< T  T  T  U< U  V< V  Y',
    'c  W^ A  R  a  N  N  X< X  X  X  X  k  k  k  k  Yv',
    'c  W  W  R  a  a  n  n  n  n  n  X  X  Z  Z> k  k',
    'c  c  c  R  R  av n  b< b  b  b  i  X  Z  f  Z  k',
    'y  y  cv d^ n  n  n  e< e  e  e  i  X  Z  fv Z  k',
    'y  m  m  d  n  h  h  h  g< g  e  i  i  Z  Z  Z  k',
    'y  m  m  d  n  hv l  h  i^ g  e  e  i  j  j  j> kv',
    'y  m  m  d  n  l< l  h  i  i  i  i  i  j  s  s  x',
    'y  m  m  m> n  n  n  n> j  j  j  j  j  j  w  s  x',
    'y  y  y  y  y  y  o^ q  q  q  q  q  q  p^ w  s  x',
    't  t  t  t  t  y  o  q  r  r  z  z  q  p  w  s  x',
    't  u  u  u  t  y  o  qv r< r  v  z  q  q  w  sv x',
    'tv uv t  t  t  y  o  v< v  v  v  z  z  z  w  w> xv',
    'y< y  y  y  y  y  o  o  o  o  o  o  o  z  z  z  z>',
  ],
  { curls: true },
);
