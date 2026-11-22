import { levelFromMap } from './levelMap';

/** Level 278 — chapter 14, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 27820, attempt 25), score 79 (Very hard). */
export default levelFromMap(
  278,
  [
    'A  A> B  B> F  F  F  F  F  F  Q  Q  Q  Q  Q  Q  C  C>',
    'B  B  B  J  F  D< D  E  E> F  F  F  F  F  F> Q  C  Y',
    'I  I  I  J  F  F  D  D  D  G< G  G  G  G  Q  Q  C  Y',
    'I  I  I  J  H^ F  F  F  F  F  F  F  F  F  Q  C  C  Y',
    'Iv I  I  Jv H  W  N  N  N  N  K^ L< L  L  Q  C  Y  Y',
    'W  W  W  W  W  W  N  U  U  N  K  K  K  K  Q  C  Y  M^',
    'W  N^ R  R  R  R  N  U  O  O  O  O> P^ K  Q  C  Y  M',
    'W  N  R  S  S  R  N  U  O  P  P  P  P  K  Qv C  Y  M',
    'W  N  Rv Sv R  R  N  U  T  T  T  T  T  T> C  C  Y  M',
    'W  N  N  N  N  N  N  Uv T  V  V  V  V  V  V  V> Y  Y',
    'W  W  W  W  W> V  V  V  V  V  Z  Z  Z  Z  Z  Z  l  Y',
    'V  V  V  V  V  V  Z  Z  Z  Z  Z  a  a  a  a  Z  l  Y',
    'V  i  i  i  i  i  i  X< X  X  X  X  X  X  a  Z  l  Yv',
    'V  i  b  b  b  b  i  Z< Z  Z  Z  a< a  a  a  Z  l  l',
    'V  i  bv c< c  b  i  d  d  d> Z  Z  Z  Z  Z  Z  e^ l',
    'V  i  i  f< f  f  i  d  k  k  k  e  j  j  j  j  e  l',
    'V  V  V  V  V  f  i  d  k  g^ k  e  j  h  h  h> e  l',
    'f  f  f  f  f  f  iv d  k  g  k  e  j  j  j  j> e  l',
    'f  v  v  v  v  v  v  d  d  k< k  e  e  e  e  e  e  lv',
    'v  v  w  w  w  w  v  v  v  v  v  v  z  z  z  z  z  z',
    'v  w  w  m  m> w  w  w  s  s  s  v  t  p  p  p  n^ z',
    'v  w  m  m  o< o  o  o  s  o  s  v  t  pv n  p  n  z',
    'v  w  m  q  q  q  q> o  o  o  s  v  t  u  n  n  n  z',
    'v  w  m  q  x  r< r  r  r  r  sv v  tv u  u  u  u> z',
    'vv wv x< x  x  y< y  y  y  y  y  v  z< z  z  z  z  z',
  ],
  { curls: true },
);
