import { cellKey, directionBetween, headOf, step } from './Arrow';
import { Grid } from './Grid';
import { findSolution } from './solver';
import type { LevelData } from './types';

/** Throws a descriptive error if the level is malformed or cannot be solved. */
export function validateLevel(level: LevelData): void {
  const ids = new Set<string>();
  const grid = new Grid(level.rows, level.cols);

  for (const arrow of level.arrows) {
    if (ids.has(arrow.id)) throw new Error(`Duplicate arrow id "${arrow.id}"`);
    ids.add(arrow.id);
    if (arrow.cells.length === 0) throw new Error(`Arrow "${arrow.id}" has no cells`);

    // The body must be a simple chain of orthogonally adjacent cells.
    const own = new Set(arrow.cells.map(cellKey));
    if (own.size !== arrow.cells.length) throw new Error(`Arrow "${arrow.id}" crosses itself`);
    for (let i = 1; i < arrow.cells.length; i++) {
      if (directionBetween(arrow.cells[i - 1], arrow.cells[i]) === null) {
        throw new Error(`Arrow "${arrow.id}" has non-adjacent cells at index ${i}`);
      }
    }

    // The head must point the way the body is travelling, otherwise the exit
    // animation (body following the head) would fold back on itself.
    if (arrow.cells.length > 1) {
      const lastSegment = directionBetween(arrow.cells[arrow.cells.length - 2], headOf(arrow));
      if (lastSegment !== arrow.direction) {
        throw new Error(`Arrow "${arrow.id}" points ${arrow.direction} but its body ends going ${lastSegment}`);
      }
    }

    // Its own exit line must not run back through its body.
    for (let c = step(headOf(arrow), arrow.direction); grid.inBounds(c); c = step(c, arrow.direction)) {
      if (own.has(cellKey(c))) throw new Error(`Arrow "${arrow.id}" points into its own body`);
    }

    grid.place(arrow); // throws on overlap or out-of-bounds cells
  }

  if (findSolution(level) === null) {
    throw new Error(`Level ${level.id} is not solvable`);
  }
}
