import { levelFromMap } from './levelMap';

/** Level 7 — generated from tools/level-plan.json (seed 750, attempt 2), score 50 (Medium–hard). */
export default levelFromMap(
  7,
  [
    'g  g  g  g  g  a< a  a',
    'g  b^ f  f  f  f  f  a',
    'g  b  b  c  c  c> f  a',
    'g  d^ b  e< e  e  fv a',
    'g  d  b  b  b  e  a  a',
    'gv d  h< h  h  e  m  m',
    'i< i  i  j^ h  m  m  q',
    'n  n  k  j  h  m  p  q',
    'n  k< k  j  j  m  p  q',
    'n  l  l  l  l> mv p  q',
    'nv l  o  o  o  o> pv qv',
  ],
  { revision: 5 },
);
