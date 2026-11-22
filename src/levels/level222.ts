import { levelFromMap } from './levelMap';

/** Level 222 — chapter 12, normal level, full board, long arrows, few free arrows, spiral and hook arrows, bottleneck and long blockers, generated from tools/level-plan.json (seed 22205, attempt 21), score 77 (Very hard). */
export default levelFromMap(
  222,
  [
    'y^ z< z  z  z  A< A  B< B  C< C  C  C  C  D< D  E^',
    'y  y  y  y  z  z  A  T  B  B  B  B  B  B  F^ D  E',
    'H  H  H  y  y  y  A  T  T  F  F  F  F  F  F  D  E',
    'H  G^ H  H  H  H> A  A  T  F  I^ J  J  J  J^ D  E',
    'H  G  G  G  G  K< K  A  T  F  I  L  L> J  J  D  E',
    'H  M  M  M> .  N^ K  A  T  F  I  L  O^ J  J  E  E',
    'H  M  P^ N  N  N  K  A  T  I  I  L  O  J  J  E  Q^',
    'P  P  P  R< R  S^ K  A  T  T  T> L  O  J  J  E  Q',
    'g  g  g  U^ R  S  A  A  X  X  V^ O  O  J  J  W^ Q',
    'g  g  g  U  U  S  S  X< X  X  V  O  f  f  f  W  Q',
    'g  g  g  a^ b  b  b  b  b  b> V  O  f  c  c> W  d^',
    'g  g  g  a  b  e  e  e  e  e> V  O  f  f  f> W  d',
    'g  g  g  a  b  e  V  V  V  V  V  O  O  O  O  W  d',
    'gv g  g  a  b  e  e  k  k  k  k  o  o  o  O  W  d',
    'a  a  a  a  b  j  e  k  h^ u  k  o  i^ o  O  d  d',
    'b  b  b  b  b  jv e  kv h  u  k  o  i  o  O  d  l^',
    'b  e  e  e  e  e  e  u  u  u  k  o  i  o  O  d  l',
    'b  m< m  n  n> s  s  u  v  v  k  i  i  ov O  d  d',
    'b  q  m  n  r  r  s  u  v  p^ k  k  k  k  k  k  d',
    'b  qv m  n  rv r  s  u  v  p  p  t  t  t  t  k  d',
    'b  b  m  n  n  r  sv u  v  v  p  tv k  k  k  k  d',
    'w  b  m  u< u  u  u  u  x  vv p  p  p  p  p  p  d',
    'wv b  m  m  m  m  m  m  x  x  x  x  x  x> d  d  d',
  ],
  { curls: true },
);
