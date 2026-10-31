import { describe, expect, it } from 'vitest';
import { createDaily, type DailyState } from '../daily/Daily';
import { addDays } from '../daily/dayKey';
import { LEVELS } from '../levels';
import { createStats, type AttemptStats, type PlayerStats } from '../profile/Stats';
import { createProgress, recordCompletion, type Progress } from '../progress/Progress';
import type { KeyValueStore } from '../storage/SafeStore';
import {
  addDayPlayTime,
  createDailyLog,
  DAILY_LOG_KEY,
  DailyLogStorage,
  KEEP_DAYS,
  lastSevenDays,
  readDailyLog,
  recordDayAttempt,
  type DailyLog,
} from './DailyLog';
import { availableInsights, INSIGHT_IDS, insightFor, pickInsight, RECAP_KEY, RecapStorage, type RecapRecords } from './insights';

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const TODAY = '2026-10-31';
const won = (mistakes = 0, timeMs = 30_000): AttemptStats => ({ outcome: 'won', directClears: 8, autoClears: 2, mistakes, uncountedTimeMs: timeMs });
const failed: AttemptStats = { outcome: 'failed', directClears: 3, autoClears: 0, mistakes: 3, uncountedTimeMs: 20_000 };

describe('daily statistics', () => {
  it('splits attempts and checkpoints by the day they happened on', () => {
    let log = createDailyLog('2026-10-20');
    log = recordDayAttempt(log, '2026-10-30', won());
    log = recordDayAttempt(log, '2026-10-30', failed);
    log = addDayPlayTime(log, '2026-10-31', 12_000);
    log = recordDayAttempt(log, '2026-10-31', won(1, 5_000));
    expect(log.days['2026-10-30']).toEqual({ playMs: 50_000, runs: 2, wins: 1, flawless: 1, arrows: 13 });
    expect(log.days['2026-10-31']).toEqual({ playMs: 17_000, runs: 1, wins: 1, flawless: 0, arrows: 10 });
    expect(addDayPlayTime(log, TODAY, 0)).toBe(log);
  });

  it('matches the lifetime statistics exactly for the same attempts', () => {
    const attempts = [won(), failed, won(2, 41_500)];
    let log = createDailyLog(TODAY);
    for (const a of attempts) log = recordDayAttempt(log, TODAY, a);
    const day = log.days[TODAY];
    expect(day.playMs).toBe(attempts.reduce((s, a) => s + a.uncountedTimeMs, 0));
    expect(day.arrows).toBe(attempts.reduce((s, a) => s + a.directClears + a.autoClears, 0));
  });

  it('keeps only the newest days', () => {
    let log = createDailyLog('2026-01-01');
    for (let i = 0; i < KEEP_DAYS + 10; i++) log = recordDayAttempt(log, addDays('2026-01-01', i), won());
    const days = Object.keys(log.days).sort();
    expect(days).toHaveLength(KEEP_DAYS);
    expect(days.at(-1)).toBe(addDays('2026-01-01', KEEP_DAYS + 9));
  });

  it('marks a week complete only when every one of its days was tracked', () => {
    let log = createDailyLog('2026-10-27'); // tracking began five days ago
    log = recordDayAttempt(log, '2026-10-28', won());
    expect(lastSevenDays(log, TODAY).complete).toBe(false);
    const fullWeek: DailyLog = { ...log, since: '2026-10-25' };
    expect(lastSevenDays(fullWeek, TODAY)).toMatchObject({ complete: true, wins: 1, daysPlayed: 1 });
    // A day outside the window doesn't count.
    const older = recordDayAttempt(fullWeek, '2026-10-24', won());
    expect(lastSevenDays(older, TODAY).wins).toBe(1);
  });

  it('round-trips through storage, starting tracking on the first day it is created', () => {
    const store = new MemoryStore();
    const storage = new DailyLogStorage(() => TODAY, store);
    const fresh = storage.load();
    expect(fresh).toEqual({ since: TODAY, days: {} });
    storage.save(recordDayAttempt(fresh, TODAY, won()));
    const later = new DailyLogStorage(() => addDays(TODAY, 3), store).load();
    expect(later.since).toBe(TODAY); // not reset by a later launch
    expect(later.days[TODAY].wins).toBe(1);
  });

  it('drops malformed days, protects newer saves and never touches other records', () => {
    const raw = JSON.stringify({
      version: 1,
      since: '2026-10-01',
      days: { '2026-10-02': { playMs: 5, runs: 1, wins: 1, flawless: 0, arrows: 4 }, '2026-10-03': { playMs: -1, runs: 1, wins: 0, flawless: 0, arrows: 0 }, nope: {} },
    });
    expect(Object.keys(readDailyLog(raw, TODAY).value.days)).toEqual(['2026-10-02']);
    expect(readDailyLog('{"version":99}', TODAY).status).toBe('newer');
    expect(readDailyLog('garbage', TODAY)).toMatchObject({ status: 'corrupt', value: { since: TODAY } });
    const store = new MemoryStore();
    store.setItem(DAILY_LOG_KEY, '{"version":99}');
    const storage = new DailyLogStorage(() => TODAY, store);
    storage.save(storage.load());
    expect(store.getItem(DAILY_LOG_KEY)).toBe('{"version":99}');
  });
});

function records(changes: Partial<RecapRecords> = {}): RecapRecords {
  return {
    progress: createProgress(),
    levels: LEVELS,
    stats: createStats(new Date('2026-10-01T12:00:00Z')),
    daily: createDaily(),
    log: createDailyLog(TODAY),
    today: TODAY,
    ...changes,
  };
}

function cleared(levels: number[], timeMs = 42_000): Progress {
  let progress = createProgress();
  for (const id of levels) progress = recordCompletion(progress, id, { moves: 5, stars: 3, mistakes: 0, timeMs }, LEVELS.length, LEVELS[id - 1].revision ?? 1).progress;
  return progress;
}

describe('recap insights', () => {
  it('has nothing to say to a brand-new player', () => {
    expect(availableInsights(records())).toEqual([]);
    expect(pickInsight(records(), 0)).toBeNull();
  });

  it('only states facts from the saved records', () => {
    const stats: PlayerStats = { ...createStats(new Date('2026-10-01T12:00:00Z')), flawlessRuns: 4, arrowsCleared: 1234, chainClears: 56, playTimeMs: 3_900_000 };
    const daily: DailyState = { ...createDaily(), lastCheckIn: TODAY, streak: 5, longestStreak: 9 };
    const r = records({ progress: cleared([1, 2, 3]), stats, daily });
    const text = Object.fromEntries(availableInsights(r).map((i) => [i.id, i.text]));
    expect(text).toEqual({
      progress: '3 of 30 levels completed. Next up: Level 4.',
      stars: '9 of 90 stars collected, with 3 perfect levels.',
      'best-time': 'Your best time on Level 3 is 00:42.',
      streak: 'Day 5 in a row. Your longest is 9.',
      flawless: '4 clears without a single mistake since 1 Oct.',
      arrows: '1,234 arrows escaped the grid since 1 Oct.',
      chains: 'Chain reactions have released 56 arrows for you.',
      'play-time': '1 h 05 min of play since 1 Oct.',
    });
  });

  it('never compares the player with other players', () => {
    const r = records({
      progress: cleared(Array.from({ length: 30 }, (_, i) => i + 1)),
      stats: { ...createStats(), flawlessRuns: 9, arrowsCleared: 900, chainClears: 90, playTimeMs: 9e6 },
      daily: { ...createDaily(), lastCheckIn: TODAY, streak: 3, longestStreak: 3 },
      log: recordDayAttempt({ since: '2026-10-01', days: {} }, addDays(TODAY, -1), won()),
    });
    const all = INSIGHT_IDS.map((id) => insightFor(id, r)).filter(Boolean);
    expect(all.length).toBe(INSIGHT_IDS.length);
    for (const i of all) expect(i!.text).not.toMatch(/players|others|average|percent|%|top |rank|better than|faster than/i);
  });

  it('ignores best times from an older layout of a redesigned level', () => {
    const progress: Progress = {
      highestUnlocked: 6,
      completed: { 5: { bestMoves: 9, revision: 2, bestStars: 3, bestMistakes: 0, bestTimeMs: 12_000 } },
    };
    expect(insightFor('best-time', records({ progress }))).toBeNull();
    expect(insightFor('progress', records({ progress }))?.text).toBe('1 of 30 levels completed. Next up: Level 1.');
  });

  it('offers daily and weekly summaries only when those days were fully tracked', () => {
    let log: DailyLog = createDailyLog(addDays(TODAY, -1));
    log = recordDayAttempt(log, addDays(TODAY, -1), won(0, 120_000));
    log = recordDayAttempt(log, addDays(TODAY, -1), won(0, 60_000));
    expect(insightFor('yesterday', records({ log }))?.text).toBe('You cleared 2 levels in 3 min of play.');
    expect(insightFor('week', records({ log }))).toBeNull(); // tracking began yesterday
    const week = { ...log, since: addDays(TODAY, -6) };
    expect(insightFor('week', records({ log: week }))?.text).toBe('2 levels cleared in 3 min of play, across 1 day.');
    expect(insightFor('yesterday', records({ log: { ...log, since: TODAY } }))).toBeNull();
  });

  it('rotates: each launch shows the next insight the records support', () => {
    const r = records({ progress: cleared([1, 2]), stats: { ...createStats(), arrowsCleared: 20 } });
    const supported = availableInsights(r).map((i) => i.id);
    expect(supported).toEqual(['progress', 'stars', 'best-time', 'arrows']);
    let next = 0;
    const shown: string[] = [];
    for (let launch = 0; launch < 6; launch++) {
      const picked = pickInsight(r, next)!;
      shown.push(picked.insight.id);
      next = picked.next;
    }
    expect(shown).toEqual(['progress', 'stars', 'best-time', 'arrows', 'progress', 'stars']);
  });

  it('keeps the rotation position in its own record', () => {
    const store = new MemoryStore();
    const storage = new RecapStorage(store);
    expect(storage.load()).toEqual({ next: 0 });
    storage.save({ next: 3 });
    expect(new RecapStorage(store).load()).toEqual({ next: 3 });
    store.setItem(RECAP_KEY, '{"version":1,"next":-2}');
    expect(new RecapStorage(store).load()).toEqual({ next: 0 });
  });
});
