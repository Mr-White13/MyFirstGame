import { levelFromMap } from '../../levelMap';

/**
 * Level 10 — the first major challenge: a single free arrow at the start,
 * twelve dependency layers and ten decoys, leading into the generated levels
 * from 11 on without a jump in difficulty.
 * Drafted with the level generator (seed 10302), reviewed for readability.
 */
export default levelFromMap(
  10,
  [
    'b  .  .  .  .  a< a  .  .',
    'bv c  d  d  d  .  a  .  .',
    '.  c  c  c> dv .  .  e  e>',
    'k  .  .  .  f< f  f  .  .',
    'k  g< g  .  h< h  i^ j^ .',
    'kv .  .  l  l> .  i  j  m^',
    '.  .  .  i  i  i  i  j  m',
    '.  .  .  n  n> .  .  .  o^',
    'p  p> q  q  q  q> .  .  o',
  ],
  { revision: 3 },
);
