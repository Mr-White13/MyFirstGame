import { levelFromMap } from './levelMap';

/** Level 203 — chapter 11, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 20324, attempt 22), score 76 (Very hard). */
export default levelFromMap(
  203,
  [
    'K  L< L  L  L  L  L  T  T  T  T  T  T  a  O  M^',
    'K  L  L  L  L  L  L  T  N^ S  S  N  T  a  O  M',
    'K  L  L  L  L  L  L  T  N  N  S  N  T  a  Ov M',
    'K  P  Q  Q  Q> P^ L  T  R^ N  Sv N  T  a  a  M',
    'K  P  P  P  P  P  L  Tv R  N  N  N  T  T  av M',
    'K  K  K  K  K  K  L  L  R  R  M  M  M  M  M  M',
    'c  b  b  b> c^ K  L  L  d  i  M  e  e  f^ C  C',
    'c  c  c  c  c  K  K  K  d  i  M  e  f  f  C  j',
    'g^ h  h  h  h  h  h> K  d  i  M  e  e> i^ C  j',
    'g  m  m  n  n  n  q  K  d  i  M  i  i  i  C  jv',
    'g  m  k^ n  u  u  q  K  d  i  i  i  l  l> C  C',
    'g  m  k  n  n  u  q  K  d  d  d  d  l  t  t  C',
    'g  mv k  k  nv u  q  K  K  K  K> dv l  t  o  C',
    'g  g  g  g  g  u  q  r  l  l  l  l  l  t  ov C',
    'p  p  p  p> g  u  qv rv l  s  s  s  s> t  t> C',
    'g  g  g  g  g  u  u  u> l  s  x  G  G  C  C  C',
    'g  D  v< v  v  w< w  F  F  F  x  x> G  C  y  y>',
    'g  D  z< z  v  z  w  F  A^ F  I  I  G  C  y  J',
    'g  D  B^ z  z  z  w  F  A  F  A  I  G  C  y  J',
    'g  D  B  B  B  B  w  F  A  F  A  I  G  Cv y  J',
    'g  Dv E  E  E  E  E> Fv A  A  A  I  Gv y  y  J',
    'H< H  H  H  H  H  I< I  I  I  I  I  J< J  J  J',
  ],
  { curls: true },
);
