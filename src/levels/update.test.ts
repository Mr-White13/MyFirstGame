import { describe, expect, it } from 'vitest';
import { applyAttempt, type AttemptSummary } from '../app/AttemptTracker';
import { addDays } from '../daily/dayKey';
import { challengePool, collectionKey, CURRENT_POOL, dailyChallenges } from '../league/challenges';
import { collect, collectedIn, settle, type LeagueState } from '../league/League';
import { LEAGUE_KEY, LeagueService, readLeague } from '../league/LeagueService';
import { createStats } from '../profile/Stats';
import { isUnlocked, nextLevelToPlay, recordCompletion, totalStars } from '../progress/Progress';
import { ProgressStorage, STORAGE_KEY } from '../progress/ProgressStorage';
import { ACHIEVEMENTS } from '../rewards/Achievements';
import { SETTINGS_KEY, SettingsStore } from '../settings/Settings';
import type { KeyValueStore } from '../storage/SafeStore';
import { LEVELS } from './index';

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

/** A version-4 progress save as written by the 10-level game: all ten levels done. */
function tenLevelSave(): string {
  const completed: Record<number, unknown> = {};
  for (let id = 1; id <= 10; id++) {
    completed[id] = { bestMoves: 9, revision: LEVELS[id - 1].revision ?? 1, bestStars: id % 3 === 0 ? 2 : 3, bestMistakes: 0, bestTimeMs: 20_000 + id * 1000 };
  }
  return JSON.stringify({ version: 4, highestUnlocked: 10, completed });
}

describe('updating from 10 to 30 levels', () => {
  it('keeps every completion, star and best time, and unlocks Level 11 for players who finished Level 10', () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, tenLevelSave());
    const progress = new ProgressStorage(LEVELS.length, store).load();
    for (let id = 1; id <= 10; id++) {
      expect(progress.completed[id]).toMatchObject({ bestStars: id % 3 === 0 ? 2 : 3, bestTimeMs: 20_000 + id * 1000 });
    }
    expect(isUnlocked(progress, 11)).toBe(true);
    expect(isUnlocked(progress, 12)).toBe(false);
    expect(nextLevelToPlay(progress, LEVELS.length)).toBe(11);
    expect(totalStars(progress, LEVELS.length)).toBe(27);
  });

  it('a player part-way through keeps exactly their unlocks', () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 4, highestUnlocked: 4, completed: { 1: { bestMoves: 5, revision: 1, bestStars: 3, bestMistakes: 0, bestTimeMs: 9000 } } }));
    const progress = new ProgressStorage(LEVELS.length, store).load();
    expect(isUnlocked(progress, 4)).toBe(true);
    expect(isUnlocked(progress, 5)).toBe(false);
  });

  it('completing Level 10 now unlocks Level 11, and Level 30 is the final level', () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, tenLevelSave());
    let progress = new ProgressStorage(LEVELS.length, store).load();
    const won = (levelId: number): AttemptSummary => ({
      levelId, revision: LEVELS[levelId - 1].revision ?? 1, outcome: 'won', timeMs: 40_000, uncountedTimeMs: 40_000,
      moves: 10, stars: 3, directClears: 10, autoClears: 0, longestChain: 0, mistakes: 0,
    });
    for (let id = 11; id <= 29; id++) {
      const { records, completion } = applyAttempt({ progress, stats: createStats() }, won(id), LEVELS.length);
      expect(completion?.unlocked).toBe(id + 1);
      progress = records.progress;
    }
    const last = applyAttempt({ progress, stats: createStats() }, won(30), LEVELS.length);
    expect(last.completion?.unlocked).toBeNull(); // nothing after the final level
    expect(LEVELS.at(-1)?.id).toBe(30); // the dialog's "game complete" variant triggers at levelCount
    expect(recordCompletion(last.records.progress, 30, { moves: 1, stars: 1, mistakes: 2, timeMs: 1 }, LEVELS.length).unlocked).toBeNull();
  });

  it('leaves rewards, achievements and settings untouched when progress is loaded with the new level count', () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, tenLevelSave());
    new SettingsStore(store).update({ theme: 'light' });
    store.setItem('neon-escape.rewards', JSON.stringify({ version: 1, wallet: { credits: 40, earned: 40, applied: ['achievement:first-escape'] }, achievements: { 'first-escape': '2026-10-01' } }));
    const before = new Map(store.data);
    new ProgressStorage(LEVELS.length, store).load();
    for (const key of [SETTINGS_KEY, 'neon-escape.rewards']) expect(store.data.get(key)).toBe(before.get(key));
    expect(ACHIEVEMENTS.find((a) => a.id === 'puzzle-veteran')).toMatchObject({ target: 10, description: 'Complete 10 different levels.' });
  });
});

describe('Daily League across a game update', () => {
  const DAY = '2026-10-31';

  it('a day that began before the update keeps its original challenges and collected arrows', () => {
    // A league record saved by the previous version: no pool on the competition, 2 arrows collected.
    const old = dailyChallenges(DAY, LEVELS, 1);
    const saved = {
      version: 1, tier: 0, highestTier: 0, inactiveStreak: 0, lastDay: DAY,
      current: { date: DAY, startTier: 0, collected: old[0].energyArrowIds.slice(0, 2).map((id) => collectionKey(old[0], id)), completed: [], sweepRewarded: false },
      history: [], lifetime: { points: 2, promotions: 0, relegations: 0, challengesCompleted: 0 }, milestones: [], outbox: [], notice: null,
    };
    const store = new MemoryStore();
    store.setItem(LEAGUE_KEY, JSON.stringify(saved));
    const league = new LeagueService(LEVELS, () => true, store);
    expect(league.current.current?.pool).toBe(1);
    league.settle(DAY, true); // same day after the update: nothing changes
    const today = league.challenges(DAY);
    expect(today).toEqual(old); // same layouts and the same Energy Arrows
    expect(collectedIn(league.current, today[0])).toBe(2);
    // The two arrows already collected can't be collected again.
    expect(league.collect(DAY, today[0], old[0].energyArrowIds[0])).toBe('duplicate');
    expect(league.collect(DAY, today[0], old[0].energyArrowIds[2])).toBe('awarded');
  });

  it('the next day uses the new pool, and the daily maximum stays 12', () => {
    const store = new MemoryStore();
    const league = new LeagueService(LEVELS, () => true, store);
    league.settle(DAY, true);
    league.settle(addDays(DAY, 1), true);
    expect(league.current.current?.pool).toBe(CURRENT_POOL);
    const next = league.challenges(addDays(DAY, 1));
    expect(next).toEqual(dailyChallenges(addDays(DAY, 1), LEVELS, CURRENT_POOL));
    const eligible = challengePool(LEVELS).map((l) => l.id);
    for (const c of next) expect(eligible).toContain(c.sourceLevelId);
    let state: LeagueState = league.current;
    for (const c of next) for (const id of c.energyArrowIds) state = collect(state, addDays(DAY, 1), c, id).state;
    expect(state.current?.collected).toHaveLength(12);
  });

  it('new competitions record the current pool, and a stored record round-trips it', () => {
    const fresh = settle({ ...readLeague(null).value }, DAY, true).state;
    expect(fresh.current?.pool).toBe(CURRENT_POOL);
    const reread = readLeague(JSON.stringify({ version: 1, ...fresh })).value;
    expect(reread.current?.pool).toBe(CURRENT_POOL);
    expect(readLeague(JSON.stringify({ version: 1, ...fresh, current: { ...fresh.current, pool: 99 } })).value.current?.pool).toBe(1);
  });
});
