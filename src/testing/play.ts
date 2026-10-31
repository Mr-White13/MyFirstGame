import { headOf, step } from '../core/Arrow';
import type { GameState } from '../core/GameState';

/**
 * The first normal arrow in level order whose way out is clear: what a
 * careful player would tap (test helper, never imported by the game).
 */
export function firstFreeArrow(state: GameState): string | undefined {
  return state.getArrows().find((a) => {
    if (state.isActivated(a.id)) return false;
    for (let c = step(headOf(a), a.direction); c.row >= 0 && c.col >= 0 && c.row < state.rows && c.col < state.cols; c = step(c, a.direction)) {
      if (state.arrowIdAt(c.row, c.col) !== undefined) return false;
    }
    return true;
  })?.id;
}
