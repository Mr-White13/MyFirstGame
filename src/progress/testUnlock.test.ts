import { describe, expect, it } from 'vitest';
import { applyAttempt } from '../app/AttemptTracker';
import { LEVELS } from '../levels';
import { createStats } from '../profile/Stats';
import { createProgress, isUnlocked, recordCompletion } from './Progress';
import { ProgressStorage, STORAGE_KEY } from './ProgressStorage';
import { canPlayLevel, isTestPlay, UNLOCK_ALL_LEVELS_FOR_TESTING } from './testUnlock';

describe('testing flag: all levels playable', () => {
  const fresh = createProgress();

  it('is on in this build and opens every one of the 30 levels', () => {
    expect(UNLOCK_ALL_LEVELS_FOR_TESTING).toBe(true);
    for (const level of LEVELS) expect(canPlayLevel(fresh, level.id, LEVELS.length)).toBe(true);
    expect(canPlayLevel(fresh, 0, LEVELS.length)).toBe(false);
    expect(canPlayLevel(fresh, 31, LEVELS.length)).toBe(false);
  });

  it('with the flag off, the normal unlock rules apply unchanged', () => {
    expect(canPlayLevel(fresh, 1, LEVELS.length, false)).toBe(true);
    expect(canPlayLevel(fresh, 2, LEVELS.length, false)).toBe(false);
    const after = recordCompletion(fresh, 1, { moves: 5, stars: 3, mistakes: 0, timeMs: 1000 }, LEVELS.length).progress;
    expect(canPlayLevel(after, 2, LEVELS.length, false)).toBe(true);
    expect(isTestPlay(after, 5, false)).toBe(false);
  });

  it('marks only really locked levels as test plays', () => {
    const progress = { highestUnlocked: 4, completed: {} };
    expect([1, 4, 5, 30].map((id) => isTestPlay(progress, id))).toEqual([false, false, true, true]);
  });

  it('never changes saved unlocks by itself', () => {
    const store = new Map<string, string>();
    const kv = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    kv.setItem(STORAGE_KEY, JSON.stringify({ version: 4, highestUnlocked: 3, completed: {} }));
    const progress = new ProgressStorage(LEVELS.length, kv).load();
    canPlayLevel(progress, 30, LEVELS.length);
    expect(progress.highestUnlocked).toBe(3);
    expect(isUnlocked(progress, 4)).toBe(false);
    expect(store.get(STORAGE_KEY)).toBe(JSON.stringify({ version: 4, highestUnlocked: 3, completed: {} }));
  });

  it('a test play would unlock levels if recorded, which is why the app skips recording it', () => {
    // App.handleLevelSolved records nothing for test plays; this shows what that prevents.
    const { records } = applyAttempt(
      { progress: fresh, stats: createStats() },
      { levelId: 25, revision: 2, outcome: 'won', timeMs: 1, uncountedTimeMs: 1, moves: 1, stars: 3, directClears: 1, autoClears: 0, cascadeClears: 0, longestChain: 0, mistakes: 0 },
      LEVELS.length,
    );
    expect(records.progress.highestUnlocked).toBe(26);
    expect(isTestPlay(fresh, 25)).toBe(true);
  });
});
