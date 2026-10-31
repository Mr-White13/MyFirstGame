import { levelFromMap } from './levelMap';

/**
 * Level 3 — the first bent arrows. Hooks (a, b, c) have to be followed to
 * their heads, and four arrows look free at a glance but are blocked further
 * along their line. Four dependency layers.
 * Drafted with the level generator (seed 3301), reviewed for readability.
 */
export default levelFromMap(
  3,
  [
    'd  a  a  .  .  .  .',
    'd  .  av .  b  b  b>',
    'd  .  .  c^ b  .  .',
    'dv .  c  c  .  e^ .',
    '.  .  .  .  f^ e  .',
    '.  .  .  .  f  e  .',
    '.  .  g  g> .  e  .',
  ],
  { revision: 3 },
);
