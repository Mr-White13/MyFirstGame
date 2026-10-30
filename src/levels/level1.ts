import { arrow } from '../core/Arrow';
import type { LevelData } from '../core/types';

/*
 * Level 1: 7x7, 13 arrows. Cells are [row, col] listed tail → head; row 0 is the top.
 *
 *        c0   c1   c2   c3   c4   c5   c6
 *   r0   a1   a1   a1>  .    .    .    a2^
 *   r1   a3   a5   a5   a5   a10  a10> a2
 *   r2   a3   a6   a6>  a5v  .    a9^  a2
 *   r3   a3v  a6   .    .    a9   a9   a13^
 *   r4   .    a8   .    a7<  a7   a7   a13
 *   r5   .    a8v  .    a11< a11  a11  a12^
 *   r6   a4<  a4   a4   a12  a12  a12  a12
 *
 * Only a2 and a4 are free at the start; every other arrow is unlocked by
 * clearing something in its way. One solution:
 *   a2 a4 a3 a8 a7 a11 a13 a12 a5 a10 a9 a6 a1
 * Solvability is also enforced at load time by validateLevel().
 */
export const level1: LevelData = {
  id: 1,
  rows: 7,
  cols: 7,
  arrows: [
    arrow('a1', 'right', [0, 0], [0, 1], [0, 2]),
    arrow('a2', 'up', [2, 6], [1, 6], [0, 6]),
    arrow('a3', 'down', [1, 0], [2, 0], [3, 0]),
    arrow('a4', 'left', [6, 2], [6, 1], [6, 0]),
    arrow('a5', 'down', [1, 1], [1, 2], [1, 3], [2, 3]),
    arrow('a6', 'right', [3, 1], [2, 1], [2, 2]),
    arrow('a7', 'left', [4, 5], [4, 4], [4, 3]),
    arrow('a8', 'down', [4, 1], [5, 1]),
    arrow('a9', 'up', [3, 4], [3, 5], [2, 5]),
    arrow('a10', 'right', [1, 4], [1, 5]),
    arrow('a11', 'left', [5, 5], [5, 4], [5, 3]),
    arrow('a12', 'up', [6, 3], [6, 4], [6, 5], [6, 6], [5, 6]),
    arrow('a13', 'up', [4, 6], [3, 6]),
  ],
};
