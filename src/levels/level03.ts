import { levelFromMap } from './levelMap';

/**
 * Level 3 — the first bent arrows. Hooks (b, c, g, h) change direction, so
 * the player has to follow each arrow to its head before judging it.
 * Drafted with the level generator (seed 104), reviewed for readability.
 */
export default levelFromMap(
  3,
  [
    '.  e  c  c  .  .  a^',
    '.  e  c  .  .  .  a',
    'b^ e  cv .  .  .  d^',
    'b  ev .  .  f^ .  d',
    'b  b  g  .  f  .  d',
    '.  .  g  g  g> h^ d',
    '.  .  .  h  h  h  .',
  ],
  { revision: 2 },
);
