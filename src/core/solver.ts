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

export interface LevelStats {
  readonly arrows: number;
  /** Arrows that can be cleared on the very first move. */
  readonly initialFree: number;
  /**
   * Length of the longest blocking chain: the number of "waves" needed if every
   * free arrow were cleared at once in each wave. A rough measure of depth.
   */
  readonly depth: number;
  /** Most arrows that have to be cleared before a single arrow becomes free. */
  readonly maxBlockers: number;
}

/** Difficulty-related numbers for a level, or null if it cannot be solved. */
export function analyzeLevel(level: LevelData): LevelStats | null {
  const grid = new Grid(level.rows, level.cols);
  level.arrows.forEach((a) => grid.place(a));

  let remaining = [...level.arrows];
  let depth = 0;
  let initialFree = 0;
  while (remaining.length > 0) {
    const wave = remaining.filter((a) => checkExitPath(grid, a).clear);
    if (wave.length === 0) return null;
    if (depth === 0) initialFree = wave.length;
    wave.forEach((a) => grid.remove(a));
    remaining = remaining.filter((a) => !wave.includes(a));
    depth++;
  }

  // Blockers per arrow: everything standing anywhere on its exit line at the start.
  let maxBlockers = 0;
  for (const a of level.arrows) {
    const blockers = new Set<string>();
    const probe = new Grid(level.rows, level.cols);
    level.arrows.forEach((other) => probe.place(other));
    for (let check = checkExitPath(probe, a); !check.clear; check = checkExitPath(probe, a)) {
      blockers.add(check.blockerId!);
      probe.remove(level.arrows.find((x) => x.id === check.blockerId)!);
    }
    maxBlockers = Math.max(maxBlockers, blockers.size);
  }

  return { arrows: level.arrows.length, initialFree, depth, maxBlockers };
}
