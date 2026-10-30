/**
 * Player progression rules: which levels are unlocked and what has been
 * completed. Pure data and functions: no storage, rendering or game rules.
 */

export interface LevelRecord {
  /** Fewest successful moves used to clear the level. */
  readonly bestMoves: number;
  /**
   * Revision of the level layout that bestMoves was achieved on (see
   * LevelData.revision). A record from an older layout still counts as
   * completed, but its move count is not compared with the new layout.
   */
  readonly revision: number;
}

export interface Progress {
  /** Highest level id the player may start (1-based). Never decreases. */
  readonly highestUnlocked: number;
  /** Completed levels by id. */
  readonly completed: Readonly<Record<number, LevelRecord>>;
}

export interface CompletionResult {
  readonly progress: Progress;
  /** True the first time this level is completed. */
  readonly firstClear: boolean;
  /** Level id that this completion unlocked, if any. */
  readonly unlocked: number | null;
}

export function createProgress(): Progress {
  return { highestUnlocked: 1, completed: {} };
}

export function isUnlocked(progress: Progress, levelId: number): boolean {
  return Number.isInteger(levelId) && levelId >= 1 && levelId <= progress.highestUnlocked;
}

export function isCompleted(progress: Progress, levelId: number): boolean {
  return progress.completed[levelId] !== undefined;
}

export function completedCount(progress: Progress, levelCount: number): number {
  return Object.keys(progress.completed)
    .map(Number)
    .filter((id) => id >= 1 && id <= levelCount).length;
}

/**
 * The level a "continue" action should open: the first unlocked level that
 * isn't completed yet, or the last unlocked one if everything is done.
 */
export function nextLevelToPlay(progress: Progress, levelCount: number): number {
  for (let id = 1; id <= Math.min(progress.highestUnlocked, levelCount); id++) {
    if (!isCompleted(progress, id)) return id;
  }
  return Math.min(progress.highestUnlocked, levelCount);
}

/**
 * Records a finished level. Progress only ever grows: replaying an earlier
 * level never locks anything, and the best move count only improves.
 */
export function recordCompletion(
  progress: Progress,
  levelId: number,
  moves: number,
  levelCount: number,
  revision = 1,
): CompletionResult {
  const previous = progress.completed[levelId];
  // Only compare with a best result from the same layout; otherwise start over.
  const bestMoves = previous && previous.revision === revision ? Math.min(previous.bestMoves, moves) : moves;
  const highestUnlocked = Math.max(progress.highestUnlocked, Math.min(levelId + 1, levelCount));
  return {
    progress: {
      highestUnlocked,
      completed: { ...progress.completed, [levelId]: { bestMoves, revision } },
    },
    firstClear: previous === undefined,
    unlocked: highestUnlocked > progress.highestUnlocked ? highestUnlocked : null,
  };
}
