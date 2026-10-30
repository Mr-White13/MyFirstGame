import { headOf, step } from './Arrow';
import type { Grid } from './Grid';
import type { ArrowData, Cell } from './types';

export interface PathCheck {
  readonly clear: boolean;
  /** Free cells in front of the head, in travel order, up to the edge or the blocker. */
  readonly path: readonly Cell[];
  readonly blockerId?: string;
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
