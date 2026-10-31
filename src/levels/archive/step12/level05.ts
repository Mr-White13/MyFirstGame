import { levelFromMap } from '../../levelMap';

/**
 * Level 5 — six dependency layers on a sparse board. Three arrows look
 * free (their next cell is empty) but are blocked further along, so glancing
 * at the head is no longer enough.
 * Drafted with the level generator (seed 5308), reviewed for readability.
 */
export default levelFromMap(
  5,
  [
    'a^ .  .  c  c  c  .',
    'a  b< b  b  b  cv .',
    'd  d  d  d> b  .  .',
    'd  g  g  .  e< e  e',
    '.  .  g  f^ .  .  .',
    '.  .  gv f  .  .  i',
    '.  h< h  f  f  .  iv',
  ],
  { revision: 3 },
);
