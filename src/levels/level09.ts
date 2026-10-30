import { levelFromMap } from './levelMap';

/**
 * Level 9 — a dense 9×9 board with long hooks (m, r, g) around a twelve-step
 * chain that opens up again near the end.
 * Drafted with the level generator (seed 211), reviewed for readability.
 */
export default levelFromMap(
  9,
  [
    '.  .  .  .  a< a  .  d  .',
    'b^ c  c> .  e  e  .  d  d>',
    'b  .  g  .  ev .  i  .  .',
    'f^ .  g  .  .  h  i  j  .',
    'f  .  g  g> l  hv iv jv m',
    'f  k^ .  .  lv m< m  m  m',
    '.  k  n  n> .  .  .  .  o^',
    'p^ .  q< q  r< r  r  r  o',
    'p  .  s  s  s> t  t  t> .',
  ],
  { revision: 2 },
);
