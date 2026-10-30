import { levelFromMap } from './levelMap';

/**
 * Level 2 — straight arrows only. The vertical arrow c holds up two others
 * (e and f) and is itself held by b: the first small chain.
 * Drafted with the level generator (seed 204), reviewed for readability.
 */
export default levelFromMap(
  2,
  [
    '.  .  .  .  .  .  .',
    '.  .  .  a< a  a  .',
    '.  .  b< b  b  .  .',
    '.  .  .  c^ .  .  .',
    'd< d  .  c  .  .  .',
    '.  .  .  c  e< e  .',
    'f  f  f> c  .  .  .',
  ],
  { revision: 2 },
);
