import { levelFromMap } from '../../levelMap';

/**
 * Level 9 — a 9×9 board with two free arrows and eleven dependency
 * layers; most steps leave only one or two arrows that can escape.
 * Drafted with the level generator (seed 9301), reviewed for readability.
 */
export default levelFromMap(
  9,
  [
    'a< a  .  b< b  d  d  d  d',
    '.  a  .  .  c^ d  .  .  .',
    '.  c  c  c  c  dv .  .  .',
    'e  e> f^ i  .  .  .  .  .',
    'g^ .  f  i  .  .  h^ .  h',
    'g  k  f  iv .  .  h  h  h',
    'j^ kv f  .  l< l  .  o  .',
    'j  m  m  m> n  n> .  ov .',
    'j  .  .  .  n  p  p  p  p>',
  ],
  { revision: 3 },
);
