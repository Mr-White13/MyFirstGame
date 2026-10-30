import { Grid } from './Grid';
import { checkExitPath } from './PathChecker';
import type { LevelData } from './types';

/**
 * Returns an order in which every arrow can be cleared, or null if the level
 * gets stuck.
 *
 * A greedy strategy is complete here: removing an arrow only ever frees cells,
 * so an arrow that is clear stays clear. Repeatedly removing any clear arrow
 * therefore empties the board whenever any solution exists.
 */
export function findSolution(level: LevelData): string[] | null {
  const grid = new Grid(level.rows, level.cols);
  level.arrows.forEach((a) => grid.place(a));

  const remaining = [...level.arrows];
  const order: string[] = [];
  while (remaining.length > 0) {
    const index = remaining.findIndex((a) => checkExitPath(grid, a).clear);
    if (index === -1) return null;
    const [next] = remaining.splice(index, 1);
    grid.remove(next);
    order.push(next.id);
  }
  return order;
}
