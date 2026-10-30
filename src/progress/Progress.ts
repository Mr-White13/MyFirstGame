/**
 * Player progression rules: which levels are unlocked and what has been
 * completed. Pure data and functions: no storage, rendering or game rules.
 */

/** Highest star rating a level can award. */
export const MAX_STARS = 3;

export interface LevelRecord {
  /** Fewest successful player moves used to clear the level. */
  readonly bestMoves: number;
  /**
   * Revision of the level layout these records were achieved on (see
   * LevelData.revision). A record from an older layout still counts as
   * completed, but its performance is not compared with the new layout.
   */
  readonly revision: number;
  /**
   * Best star rating (1..3), or null when the level is "unranked": completed
   * before stars existed, or only on an older layout revision. Unranked levels
   * stay completed and unlocked; their next clear sets a rating.
   */
  readonly bestStars: number | null;
  /** Fewest mistakes in a completed run, or null if unranked. */
  readonly bestMistakes: number | null;
}

/** What one successful run achieved. */
export interface CompletionStats {
  readonly moves: number;
  /** 1..3: lives left at the end. */
  readonly stars: number;
  readonly mistakes: number;
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
  /** True if this run set a higher star rating than before (including a first rating). */
  readonly newBestStars: boolean;
  /** The best rating after this run. */
  readonly bestStars: number;
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

/** Sum of best ratings over the available levels (unranked levels count 0). */
export function totalStars(progress: Progress, levelCount: number): number {
  let total = 0;
  for (let id = 1; id <= levelCount; id++) total += progress.completed[id]?.bestStars ?? 0;
  return total;
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
 * level never locks anything, and best results (stars, mistakes, moves) only
 * improve. Results from an older layout revision are not compared with the
 * current one: the first clear on the new layout starts fresh records.
 */
export function recordCompletion(
  progress: Progress,
  levelId: number,
  run: CompletionStats,
  levelCount: number,
  revision = 1,
): CompletionResult {
  const previous = progress.completed[levelId];
  const comparable = previous !== undefined && previous.revision === revision;
  const stars = Math.max(1, Math.min(MAX_STARS, Math.round(run.stars)));

  const bestMoves = comparable ? Math.min(previous.bestMoves, run.moves) : run.moves;
  const oldStars = comparable ? previous.bestStars : null;
  const bestStars = oldStars === null ? stars : Math.max(oldStars, stars);
  const oldMistakes = comparable ? previous.bestMistakes : null;
  const bestMistakes = oldMistakes === null ? run.mistakes : Math.min(oldMistakes, run.mistakes);

  const highestUnlocked = Math.max(progress.highestUnlocked, Math.min(levelId + 1, levelCount));
  return {
    progress: {
      highestUnlocked,
      completed: { ...progress.completed, [levelId]: { bestMoves, revision, bestStars, bestMistakes } },
    },
    firstClear: previous === undefined,
    unlocked: highestUnlocked > progress.highestUnlocked ? highestUnlocked : null,
    newBestStars: oldStars === null || stars > oldStars,
    bestStars,
  };
}
