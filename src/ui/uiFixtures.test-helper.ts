import type { LevelData } from '../core/types';
import type { LevelRecord, Progress } from '../progress/Progress';

/*
 * TEST ONLY. Fixed progress states for the UI characterization tests. Levels
 * are synthetic (only id, size and revision matter to the screens), so editing
 * a real level layout never changes these goldens.
 */

export const LEVEL_COUNT = 30;

export const LEVELS: readonly LevelData[] = Array.from({ length: LEVEL_COUNT }, (_, i) => {
  const id = i + 1;
  const base = { id, rows: 5 + (id % 4), cols: 4 + (id % 3), arrows: [] };
  return id % 5 === 0 ? { ...base, revision: 2 } : base;
});

const revisionOf = (id: number) => LEVELS[id - 1]?.revision ?? 1;

function rec(id: number, bestStars: number | null, bestTimeMs: number | null, olderLayout = false): [number, LevelRecord] {
  const revision = olderLayout ? revisionOf(id) - 1 || 0 : revisionOf(id);
  return [id, { bestMoves: 10 + id, revision, bestStars, bestMistakes: bestStars === null ? null : 3 - bestStars, bestTimeMs }];
}

const progress = (highestUnlocked: number, records: [number, LevelRecord][]): Progress => ({
  highestUnlocked,
  completed: Object.fromEntries(records),
});

export const PROGRESS: Readonly<Record<string, Progress>> = {
  fresh: progress(1, []),
  /** Chapter 1 in progress: every star count, unranked, untimed and an older-layout record. */
  mid: progress(8, [
    rec(1, 3, 12_345),
    rec(2, 2, 61_000),
    rec(3, 1, null),
    rec(4, null, 9_870),
    rec(5, 3, 45_500, true),
    rec(6, null, null),
    rec(7, 2, 3_600_001),
  ]),
  /** Into chapter 2, with a gap left behind in chapter 1. */
  chapter2: progress(24, [
    ...Array.from({ length: 19 }, (_, i) => rec(i + 1, (i % 3) + 1, 20_000 + i * 1_000)),
    rec(21, 3, 30_250),
    rec(22, 1, 99_999),
    rec(23, 2, null),
  ]),
  allComplete: progress(30, Array.from({ length: LEVEL_COUNT }, (_, i) => rec(i + 1, 3, 10_000 + i * 500))),
};
