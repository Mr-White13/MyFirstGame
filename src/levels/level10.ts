import { levelFromMap } from './levelMap';

/** Level 10 — chapter 1, hard level, generated from tools/level-plan.json (seed 1050, attempt 8), score 59 (Hard). */
export default levelFromMap(
  10,
  [
    'a< a  a  a  a  b< b  b  b',
    'c  c  c  c  a  a  a  a  b',
    'c  g  g  c  c  c  c> a  d^',
    'c  g  e< e  e  e  e  e  d',
    'f^ g  g  g  g  g> d  d  d',
    'f  h  h  h> i  i  i  i> j^',
    'f  k^ l  l  l  l  l> m^ j',
    'f  k  k  o  o  s^ q^ m  j',
    'f  f  k  k  o  s  q  m  j',
    'n^ f  f  p  ov s  q  j  j',
    'n  n  p< p  r  s  q  q  q',
    'r< r  r  r  r  s  t< t  t',
  ],
  { revision: 6, tier: 'hard' },
);
