import { describe, expect, it } from 'vitest';
import {
  completedCount,
  createProgress,
  isCompleted,
  isUnlocked,
  nextLevelToPlay,
  recordCompletion,
  type Progress,
} from './Progress';
import { parseProgress, ProgressStorage, serializeProgress, STORAGE_KEY, type KeyValueStore } from './ProgressStorage';

const LEVELS = 10;

/** Completes levels 1..n in order with the given move count. */
function completeUpTo(n: number, moves = 5): Progress {
  let progress = createProgress();
  for (let id = 1; id <= n; id++) progress = recordCompletion(progress, id, moves, LEVELS).progress;
  return progress;
}

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('progression rules', () => {
  it('starts with only level 1 unlocked', () => {
    const progress = createProgress();
    expect(isUnlocked(progress, 1)).toBe(true);
    expect(isUnlocked(progress, 2)).toBe(false);
    expect(completedCount(progress, LEVELS)).toBe(0);
    expect(nextLevelToPlay(progress, LEVELS)).toBe(1);
  });

  it('completing a level unlocks the next one', () => {
    const result = recordCompletion(createProgress(), 1, 5, LEVELS);
    expect(result.firstClear).toBe(true);
    expect(result.unlocked).toBe(2);
    expect(isCompleted(result.progress, 1)).toBe(true);
    expect(isUnlocked(result.progress, 2)).toBe(true);
    expect(isUnlocked(result.progress, 3)).toBe(false);
  });

  it('replaying an earlier level keeps later levels unlocked', () => {
    const before = completeUpTo(4);
    const result = recordCompletion(before, 1, 9, LEVELS);
    expect(result.progress.highestUnlocked).toBe(5);
    expect(result.unlocked).toBeNull();
    expect(result.firstClear).toBe(false);
    expect(completedCount(result.progress, LEVELS)).toBe(4);
  });

  it('keeps the best (lowest) move count', () => {
    let progress = recordCompletion(createProgress(), 1, 8, LEVELS).progress;
    progress = recordCompletion(progress, 1, 6, LEVELS).progress;
    progress = recordCompletion(progress, 1, 7, LEVELS).progress;
    expect(progress.completed[1].bestMoves).toBe(6);
  });

  it('does not unlock past the last level', () => {
    const progress = completeUpTo(10);
    expect(progress.highestUnlocked).toBe(10);
    expect(completedCount(progress, LEVELS)).toBe(10);
  });

  it('points "continue" at the first unfinished level', () => {
    let progress = completeUpTo(3);
    expect(nextLevelToPlay(progress, LEVELS)).toBe(4);
    progress = completeUpTo(10);
    expect(nextLevelToPlay(progress, LEVELS)).toBe(10);
  });

  it('never mutates the previous progress object', () => {
    const before = createProgress();
    recordCompletion(before, 1, 5, LEVELS);
    expect(before).toEqual(createProgress());
  });
});

describe('save data', () => {
  it('round-trips through serialize/parse', () => {
    const progress = completeUpTo(3, 7);
    expect(parseProgress(serializeProgress(progress), LEVELS)).toEqual(progress);
  });

  it.each([
    ['missing', null],
    ['not JSON', '{oops'],
    ['JSON null', 'null'],
    ['a number', '42'],
    ['an array', '[1,2,3]'],
    ['no version', '{"highestUnlocked":5,"completed":{}}'],
    ['an unknown version', '{"version":99,"highestUnlocked":5,"completed":{}}'],
  ])('falls back to a new game when data is %s', (_label, raw) => {
    expect(parseProgress(raw, LEVELS)).toEqual(createProgress());
  });

  it('drops invalid entries but keeps valid ones', () => {
    const raw = JSON.stringify({
      version: 1,
      highestUnlocked: 'lots',
      completed: {
        1: { bestMoves: 5 },
        2: { bestMoves: -3 },
        3: null,
        abc: { bestMoves: 4 },
        4.5: { bestMoves: 4 },
        99: { bestMoves: 4 },
      },
    });
    expect(parseProgress(raw, LEVELS)).toEqual({ highestUnlocked: 2, completed: { 1: { bestMoves: 5 } } });
  });

  it('clamps an out-of-range unlock to the available levels', () => {
    const raw = JSON.stringify({ version: 1, highestUnlocked: 500, completed: {} });
    expect(parseProgress(raw, LEVELS).highestUnlocked).toBe(LEVELS);
    const low = JSON.stringify({ version: 1, highestUnlocked: -2, completed: {} });
    expect(parseProgress(low, LEVELS).highestUnlocked).toBe(1);
  });

  it('repairs unlocks that lag behind completions', () => {
    const raw = JSON.stringify({ version: 1, highestUnlocked: 1, completed: { 1: { bestMoves: 5 }, 2: { bestMoves: 7 } } });
    expect(parseProgress(raw, LEVELS).highestUnlocked).toBe(3);
  });

  it('extends progress when more levels exist than when it was saved', () => {
    const savedWithTen = serializeProgress(completeUpTo(10));
    expect(parseProgress(savedWithTen, 12).highestUnlocked).toBe(11);
  });
});

describe('ProgressStorage', () => {
  it('persists across instances (like a page refresh)', () => {
    const store = new MemoryStore();
    new ProgressStorage(LEVELS, store).save(completeUpTo(2));
    expect(new ProgressStorage(LEVELS, store).load()).toEqual(completeUpTo(2));
  });

  it('loads a new game from corrupted storage without throwing', () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, '\u0000not json at all');
    expect(new ProgressStorage(LEVELS, store).load()).toEqual(createProgress());
  });

  it('survives storage that throws on access', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const storage = new ProgressStorage(LEVELS, broken);
    expect(storage.load()).toEqual(createProgress());
    expect(storage.save(completeUpTo(1))).toBe(false);
  });

  it('works without any storage at all', () => {
    const storage = new ProgressStorage(LEVELS, null);
    expect(storage.load()).toEqual(createProgress());
    expect(storage.save(createProgress())).toBe(false);
  });
});
