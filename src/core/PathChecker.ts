import { headOf, step } from './Arrow';
import type { Grid } from './Grid';
import type { ArrowData, Cell, Direction } from './types';

export interface PathCheck {
  readonly clear: boolean;
  /** Free cells in front of the head, in travel order, up to the edge or the blocker. */
  readonly path: readonly Cell[];
  readonly blockerId?: string;
}

/**
 * The board cells in front of `head` in `direction`, nearest first, up to the
 * edge, whatever stands on them: the line an arrow with that head travels along.
 */
export function exitRay(head: Cell, direction: Direction, rows: number, cols: number): Cell[] {
  const cells: Cell[] = [];
  for (let c = step(head, direction); c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols; c = step(c, direction)) cells.push(c);
  return cells;
}

/**
 * Walks from the arrow's head towards the board edge in its direction.
 * Only the head's line matters: the body slides along cells the arrow
 * already owns, so it can never be blocked on its own.
 */
export function checkExitPath(grid: Grid, arrow: ArrowData): PathCheck {
  const path: Cell[] = [];
  for (let cell = step(headOf(arrow), arrow.direction); grid.inBounds(cell); cell = step(cell, arrow.direction)) {
    const occupant = grid.occupantAt(cell);
    if (occupant !== undefined && occupant !== arrow.id) {
      return { clear: false, path, blockerId: occupant };
    }
    path.push(cell);
  }
  return { clear: true, path };
}
