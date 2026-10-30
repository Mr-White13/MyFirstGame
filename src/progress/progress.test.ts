import { describe, expect, it } from 'vitest';
import {
  completedCount,
  createProgress,
  isCompleted,
  isUnlocked,
  nextLevelToPlay,
  recordCompletion,
  totalStars,
  type Progress,
} from './Progress';
import {
  BACKUP_KEY,
  parseProgress,
  ProgressStorage,
  readProgress,
  serializeProgress,
  STORAGE_KEY,
  type KeyValueStore,
} from './ProgressStorage';

const LEVELS = 10;

/** Completes levels 1..n in order with the given move count. */
function completeUpTo(n: number, moves = 5): Progress {
  let progress = createProgress();
  for (let id = 1; id <= n; id++) progress = recordCompletion(progress, id, run(moves), LEVELS).progress;
  return progress;
}

/** A run with the given move count; stars and mistakes default to a flawless clear. */
function run(moves: number, stars = 3, mistakes = 0) {
  return { moves, stars, mistakes };
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
    const result = recordCompletion(createProgress(), 1, run(5), LEVELS);
    expect(result.firstClear).toBe(true);
    expect(result.unlocked).toBe(2);
    expect(isCompleted(result.progress, 1)).toBe(true);
    expect(isUnlocked(result.progress, 2)).toBe(true);
    expect(isUnlocked(result.progress, 3)).toBe(false);
  });

  it('replaying an earlier level keeps later levels unlocked', () => {
    const before = completeUpTo(4);
    const result = recordCompletion(before, 1, run(9), LEVELS);
    expect(result.progress.highestUnlocked).toBe(5);
    expect(result.unlocked).toBeNull();
    expect(result.firstClear).toBe(false);
    expect(completedCount(result.progress, LEVELS)).toBe(4);
  });

  it('keeps the best (lowest) move count', () => {
    let progress = recordCompletion(createProgress(), 1, run(8), LEVELS).progress;
    progress = recordCompletion(progress, 1, run(6), LEVELS).progress;
    progress = recordCompletion(progress, 1, run(7), LEVELS).progress;
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
    recordCompletion(before, 1, run(5), LEVELS);
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
    ['a newer version', '{"version":99,"highestUnlocked":5,"completed":{}}'],
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
    expect(parseProgress(raw, LEVELS)).toEqual({ highestUnlocked: 2, completed: { 1: { bestMoves: 5, revision: 1, bestStars: null, bestMistakes: null } } });
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

describe('save migration and protection', () => {
  const v1 = JSON.stringify({ version: 1, highestUnlocked: 4, completed: { 1: { bestMoves: 5 }, 2: { bestMoves: 7 }, 3: { bestMoves: 9 } } });

  it('migrates version 1 saves without losing unlocks or completions', () => {
    const { progress, status } = readProgress(v1, LEVELS);
    expect(status).toBe('migrated');
    expect(progress.highestUnlocked).toBe(4);
    expect(progress.completed).toEqual({
      1: { bestMoves: 5, revision: 1, bestStars: null, bestMistakes: null },
      2: { bestMoves: 7, revision: 1, bestStars: null, bestMistakes: null },
      3: { bestMoves: 9, revision: 1, bestStars: null, bestMistakes: null },
    });
  });

  it('rewrites a migrated save in the current format on the next save', () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, v1);
    const storage = new ProgressStorage(LEVELS, store);
    storage.save(storage.load());
    expect(readProgress(store.getItem(STORAGE_KEY), LEVELS).status).toBe('current');
  });

  it('keeps a completion from an older layout but starts a fresh best for the new one', () => {
    const old = readProgress(v1, LEVELS).progress;
    const replayed = recordCompletion(old, 2, run(12), LEVELS, 2);
    expect(replayed.progress.completed[2]).toEqual({ bestMoves: 12, revision: 2, bestStars: 3, bestMistakes: 0 });
    expect(replayed.firstClear).toBe(false);
    expect(replayed.progress.highestUnlocked).toBe(4);
    // Same layout again: the best only improves.
    const again = recordCompletion(replayed.progress, 2, run(14), LEVELS, 2);
    expect(again.progress.completed[2]).toEqual({ bestMoves: 12, revision: 2, bestStars: 3, bestMistakes: 0 });
  });

  it('backs up corrupted data before it can be replaced', () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, '{broken');
    const storage = new ProgressStorage(LEVELS, store);
    expect(storage.load()).toEqual(createProgress());
    expect(store.getItem(BACKUP_KEY)).toBe('{broken');
    expect(storage.save(completeUpTo(1))).toBe(true);
    // A second bad load keeps the first backup.
    store.setItem(STORAGE_KEY, 'also broken');
    new ProgressStorage(LEVELS, store).load();
    expect(store.getItem(BACKUP_KEY)).toBe('{broken');
  });

  it('never overwrites a save written by a newer version of the game', () => {
    const store = new MemoryStore();
    const future = JSON.stringify({ version: 99, somethingNew: true });
    store.setItem(STORAGE_KEY, future);
    const storage = new ProgressStorage(LEVELS, store);
    expect(storage.load()).toEqual(createProgress());
    expect(storage.save(completeUpTo(3))).toBe(false);
    expect(store.getItem(STORAGE_KEY)).toBe(future);
    expect(store.getItem(BACKUP_KEY)).toBe(future);
  });
});

describe('star ratings', () => {
  it('saves the stars of a run and reports a new best', () => {
    const result = recordCompletion(createProgress(), 1, run(5, 2, 1), LEVELS);
    expect(result.progress.completed[1]).toMatchObject({ bestStars: 2, bestMistakes: 1 });
    expect(result.newBestStars).toBe(true);
    expect(result.bestStars).toBe(2);
  });

  it('never lowers a best rating or relocks anything on replay', () => {
    let progress = recordCompletion(createProgress(), 1, run(5, 3, 0), LEVELS).progress;
    progress = recordCompletion(progress, 2, run(6, 3, 0), LEVELS).progress;
    const worse = recordCompletion(progress, 1, run(5, 1, 2), LEVELS);
    expect(worse.progress.completed[1]).toMatchObject({ bestStars: 3, bestMistakes: 0 });
    expect(worse.newBestStars).toBe(false);
    expect(worse.progress.highestUnlocked).toBe(3);
  });

  it('improves a rating when a replay is better', () => {
    let progress = recordCompletion(createProgress(), 1, run(5, 1, 2), LEVELS).progress;
    const better = recordCompletion(progress, 1, run(5, 3, 0), LEVELS);
    progress = better.progress;
    expect(progress.completed[1]).toMatchObject({ bestStars: 3, bestMistakes: 0 });
    expect(better.newBestStars).toBe(true);
  });

  it('counts stars over rated levels only', () => {
    const v2 = JSON.stringify({ version: 2, highestUnlocked: 3, completed: { 1: { bestMoves: 5, revision: 1 } } });
    let progress = parseProgress(v2, LEVELS); // level 1 completed but unranked
    progress = recordCompletion(progress, 2, run(6, 2, 1), LEVELS).progress;
    expect(totalStars(progress, LEVELS)).toBe(2);
  });

  it('migrates version 2 saves: unlocks and completions kept, ratings unranked', () => {
    const v2 = JSON.stringify({
      version: 2,
      highestUnlocked: 5,
      completed: { 1: { bestMoves: 5, revision: 1 }, 2: { bestMoves: 6, revision: 2 }, 4: { bestMoves: 10, revision: 2 } },
    });
    const { progress, status } = readProgress(v2, LEVELS);
    expect(status).toBe('migrated');
    expect(progress.highestUnlocked).toBe(5);
    expect(Object.keys(progress.completed).map(Number)).toEqual([1, 2, 4]);
    for (const record of Object.values(progress.completed)) {
      expect(record.bestStars).toBeNull();
      expect(record.bestMistakes).toBeNull();
    }
  });

  it('gives an unranked completion its first rating on the next clear, keeping it completed', () => {
    const v2 = JSON.stringify({ version: 2, highestUnlocked: 2, completed: { 1: { bestMoves: 5, revision: 1 } } });
    const old = parseProgress(v2, LEVELS);
    expect(isCompleted(old, 1)).toBe(true);
    const replay = recordCompletion(old, 1, run(5, 1, 2), LEVELS, 1);
    expect(replay.firstClear).toBe(false);
    expect(replay.newBestStars).toBe(true);
    expect(replay.progress.completed[1]).toMatchObject({ bestStars: 1, bestMistakes: 2 });
  });

  it('starts fresh ratings when the level layout revision changes', () => {
    const rated = recordCompletion(createProgress(), 1, run(5, 3, 0), LEVELS, 1).progress;
    const redesigned = recordCompletion(rated, 1, run(7, 2, 1), LEVELS, 2);
    expect(redesigned.progress.completed[1]).toMatchObject({ bestStars: 2, bestMistakes: 1, revision: 2 });
  });

  it('treats missing or malformed star values as unranked', () => {
    const raw = JSON.stringify({
      version: 3,
      highestUnlocked: 6,
      completed: {
        1: { bestMoves: 5, revision: 1, bestStars: 3, bestMistakes: 0 },
        2: { bestMoves: 5, revision: 1, bestStars: 7, bestMistakes: 0 },
        3: { bestMoves: 5, revision: 1, bestStars: 'three', bestMistakes: 0 },
        4: { bestMoves: 5, revision: 1, bestStars: 2, bestMistakes: -1 },
        5: { bestMoves: 5, revision: 1 },
      },
    });
    const { progress, status } = readProgress(raw, LEVELS);
    expect(status).toBe('current');
    expect(progress.completed[1]).toMatchObject({ bestStars: 3, bestMistakes: 0 });
    expect(progress.completed[2].bestStars).toBeNull();
    expect(progress.completed[3].bestStars).toBeNull();
    expect(progress.completed[4]).toMatchObject({ bestStars: 2, bestMistakes: null });
    expect(progress.completed[5].bestStars).toBeNull();
    expect(progress.highestUnlocked).toBe(6);
  });

  it('round-trips ratings through storage', () => {
    const store = new MemoryStore();
    const progress = recordCompletion(createProgress(), 1, run(5, 2, 1), LEVELS).progress;
    new ProgressStorage(LEVELS, store).save(progress);
    expect(new ProgressStorage(LEVELS, store).load()).toEqual(progress);
  });
});
