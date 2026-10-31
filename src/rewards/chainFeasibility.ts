import { GameState } from '../core/GameState';
import type { LevelData } from '../core/types';

/**
 * Searches for a way to make one move release `target` red arrows in a
 * single chain reaction without running out of lives. Used by the tests to
 * prove chain achievements are actually reachable on the shipped levels.
 * Returns the tap sequence, or null.
 *
 * Depth-first over tap sequences, replaying from the start each time (levels
 * are small). Mistakes are capped at lives - 1, because the level ends on the
 * last one.
 */
export function findChain(level: LevelData, target: number, maxDepth = level.arrows.length + 2): string[] | null {
  const replay = (taps: readonly string[]) => {
    const state = new GameState(level, { validate: false, clock: () => 0 });
    for (const id of taps) state.tryMove(id);
    return state;
  };
  const seen = new Set<string>();

  const search = (taps: string[]): string[] | null => {
    const state = replay(taps);
    const snap = state.snapshot();
    if (snap.longestChain >= target) return taps;
    if (snap.status !== 'playing' || taps.length >= maxDepth) return null;
    const key = state
      .getArrows()
      .map((a) => `${a.id}${state.isActivated(a.id) ? '!' : ''}`)
      .join(',');
    if (seen.has(key)) return null;
    seen.add(key);
    for (const arrow of state.getArrows()) {
      if (state.isActivated(arrow.id)) continue; // re-tapping a red arrow changes nothing
      const probe = replay(taps);
      const result = probe.tryMove(arrow.id);
      if (result.kind === 'blocked' && (result.failed || probe.snapshot().lives < 1)) continue;
      const found = search([...taps, arrow.id]);
      if (found) return found;
    }
    return null;
  };
  return search([]);
}
