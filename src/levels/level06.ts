import { levelFromMap } from './levelMap';

/**
 * Level 6 — first 8×8 board. Many arrows are blocked from far away along
 * long, empty-looking lines (12 of the 18 blocking links are 3+ cells long).
 * Drafted with the level generator (seed 107), reviewed for readability.
 */
export default levelFromMap(
  6,
  [
    '.  b  a  a> .  .  .  c',
    '.  b  b  b> .  .  .  cv',
    'd  d  d  .  .  .  .  f',
    'dv i  .  e< e  e  e  fv',
    '.  i  .  g^ .  .  .  .',
    '.  i  .  g  h  h  h  h>',
    'i< i  g  g  k  l  .  m',
    'j  j  j> .  kv l  l> mv',
  ],
  { revision: 2 },
);
