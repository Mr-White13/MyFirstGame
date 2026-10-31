import { describe, expect, it } from 'vitest';
import { NavigationHistory } from '../app/Navigation';
import { LEVELS } from '../levels';
import type { KeyValueStore } from '../storage/SafeStore';
import {
  CHAPTER_SIZE,
  chapterCount,
  chapterOf,
  chapterRange,
  chapterSummary,
  chapterTiles,
  clampChapter,
  currentChapter,
  queryRecords,
  recordEntry,
  recordsSummary,
  RECORDS_PAGE_SIZE,
  searchLevelIds,
} from './chapters';
import { createProgress, recordCompletion, type LevelRecord, type Progress } from './Progress';
import { ProgressStorage, STORAGE_KEY } from './ProgressStorage';

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const record = (stars: number | null, timeMs: number | null, revision = 1): LevelRecord => ({ bestMoves: 10, revision, bestStars: stars, bestMistakes: stars === null ? null : 3 - stars, bestTimeMs: timeMs });

/** A simulated game of `count` levels where the first `done` are completed (stars cycle 1–3). */
function simulated(count: number, done: number): Progress {
  const completed: Record<number, LevelRecord> = {};
  for (let id = 1; id <= done; id++) completed[id] = record(((id - 1) % 3) + 1, 10_000 + id);
  return { highestUnlocked: Math.min(count, done + 1), completed };
}

const sameRevision = () => 1;

describe('chapters', () => {
  it('groups levels into chapters of 20; the last chapter may be shorter', () => {
    expect(CHAPTER_SIZE).toBe(20);
    expect(chapterCount(30)).toBe(2);
    expect(chapterCount(1000)).toBe(50);
    expect(chapterCount(1001)).toBe(51);
    expect(chapterRange(1, 30)).toEqual({ first: 1, last: 20 });
    expect(chapterRange(2, 30)).toEqual({ first: 21, last: 30 });
    expect(chapterRange(50, 1000)).toEqual({ first: 981, last: 1000 });
    expect([1, 20, 21, 40, 41, 1000].map(chapterOf)).toEqual([1, 1, 2, 2, 3, 50]);
  });

  it('clamps chapter numbers to the chapters that exist', () => {
    expect(clampChapter(0, 30)).toBe(1);
    expect(clampChapter(-5, 30)).toBe(1);
    expect(clampChapter(3, 30)).toBe(2);
    expect(clampChapter(Number.NaN, 30)).toBe(1);
    expect(chapterRange(99, 30)).toEqual({ first: 21, last: 30 });
  });

  it('summarises a chapter: completion and stars', () => {
    const progress = simulated(1000, 25);
    expect(chapterSummary(progress, 1, 1000)).toMatchObject({ completed: 20, levels: 20, stars: 39, maxStars: 60, unlocked: true });
    expect(chapterSummary(progress, 2, 1000)).toMatchObject({ first: 21, last: 40, completed: 5, unlocked: true });
    expect(chapterSummary(progress, 3, 1000)).toMatchObject({ completed: 0, stars: 0, unlocked: false });
  });

  it('jumps to the chapter of the level to play next', () => {
    expect(currentChapter(createProgress(), 1000)).toBe(1);
    expect(currentChapter(simulated(1000, 25), 1000)).toBe(2); // level 26
    expect(currentChapter(simulated(1000, 999), 1000)).toBe(50);
  });
});

describe('level select tiles', () => {
  it('shows only one chapter at a time, however many levels there are', () => {
    const progress = simulated(1000, 500);
    for (let chapter = 1; chapter <= chapterCount(1000); chapter++) {
      const tiles = chapterTiles(progress, chapter, 1000, false);
      expect(tiles.length).toBeLessThanOrEqual(CHAPTER_SIZE);
      expect(tiles[0].id).toBe((chapter - 1) * CHAPTER_SIZE + 1);
    }
  });

  it('keeps completed, current, open, locked and test-unlocked tiles distinct', () => {
    // 1–3 done; 4 is next; 6 really unlocked but not next (unlocked further by an old save).
    const progress: Progress = { highestUnlocked: 6, completed: { 1: record(3, 1), 2: record(null, null), 3: record(2, 5) } };
    const tiles = chapterTiles(progress, 1, 30, false);
    expect(tiles.slice(0, 8).map((t) => t.state)).toEqual(['completed', 'completed', 'completed', 'current', 'open', 'open', 'locked', 'locked']);
    expect(tiles.slice(0, 3).map((t) => t.bestStars)).toEqual([3, null, 2]); // level 2: completed but unranked
    const testing = chapterTiles(progress, 1, 30, true);
    expect(testing.slice(5, 8).map((t) => t.state)).toEqual(['open', 'test', 'test']);
    expect(chapterTiles(progress, 2, 30, false).every((t) => t.state === 'locked')).toBe(true);
  });

  it('is quick with 1,000 levels: every chapter of a big game in a few milliseconds', () => {
    const progress = simulated(1000, 1000);
    const start = performance.now();
    for (let chapter = 1; chapter <= 50; chapter++) {
      chapterTiles(progress, chapter, 1000, false);
      chapterSummary(progress, chapter, 1000);
    }
    expect(performance.now() - start).toBeLessThan(200); // generous: it is ~1 ms on a laptop
  });
});

describe('personal records', () => {
  it('reads records straight from the save, and never invents one', () => {
    const progress: Progress = { highestUnlocked: 3, completed: { 1: record(3, 12_000), 2: record(null, null) } };
    expect(recordEntry(progress, 1, sameRevision)).toEqual({ levelId: 1, status: 'completed', bestStars: 3, bestTimeMs: 12_000, olderLayout: false });
    expect(recordEntry(progress, 2, sameRevision)).toMatchObject({ status: 'completed', bestStars: null, bestTimeMs: null });
    expect(recordEntry(progress, 3, sameRevision)).toEqual({ levelId: 3, status: 'not completed', bestStars: null, bestTimeMs: null, olderLayout: false });
    expect(recordEntry(progress, 900, sameRevision)).toMatchObject({ status: 'locked', bestStars: null, bestTimeMs: null });
  });

  it('marks bests that were set on an earlier layout of the level', () => {
    const progress: Progress = { highestUnlocked: 2, completed: { 1: record(3, 12_000, 2) } };
    expect(recordEntry(progress, 1, () => 3).olderLayout).toBe(true);
    expect(recordEntry(progress, 1, () => 2).olderLayout).toBe(false);
  });

  it('a chapter page has exactly that chapter\'s levels', () => {
    const page = queryRecords(simulated(1000, 300), 1000, { chapter: 15 }, sameRevision);
    expect(page.chapter).toBe(15);
    expect(page.entries.map((e) => e.levelId)).toEqual(Array.from({ length: 20 }, (_, i) => 281 + i));
    expect(page.entries.filter((e) => e.status === 'completed')).toHaveLength(20);
  });

  it('finds levels by number: exact match first, then longer numbers with the same digits', () => {
    expect(searchLevelIds('7', 1000)).toEqual({ ids: [7, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 700, 701, 702, 703, 704, 705, 706, 707, 708], matches: 111 });
    expect(searchLevelIds('25', 30)).toEqual({ ids: [25], matches: 1 });
    expect(searchLevelIds('3', 30)).toEqual({ ids: [3, 30], matches: 2 });
    expect(searchLevelIds('1000', 1000)).toEqual({ ids: [1000], matches: 1 });
    expect(searchLevelIds('007', 30)).toEqual({ ids: [7], matches: 1 }); // leading zeros ignored
  });

  it('returns nothing for numbers that don\'t exist or aren\'t numbers', () => {
    expect(searchLevelIds('31', 30).ids).toEqual([]);
    expect(searchLevelIds('0', 30).ids).toEqual([]);
    expect(searchLevelIds('', 30).ids).toEqual([]);
    expect(searchLevelIds('a1', 30).ids).toEqual([]);
    expect(queryRecords(createProgress(), 30, { search: '99' }, sameRevision)).toEqual({ entries: [], chapter: null, matches: 0 });
  });

  it('never builds more than one page of rows, even with 1,000 records', () => {
    const progress = simulated(1000, 1000);
    for (const search of ['1', '2', '9', '10', '100', '999']) {
      const page = queryRecords(progress, 1000, { search }, sameRevision);
      expect(page.entries.length).toBeLessThanOrEqual(RECORDS_PAGE_SIZE);
      expect(page.entries.every((e) => String(e.levelId).startsWith(search))).toBe(true);
    }
    const start = performance.now();
    for (let chapter = 1; chapter <= 50; chapter++) queryRecords(progress, 1000, { chapter }, sameRevision);
    for (let n = 1; n <= 1000; n++) queryRecords(progress, 1000, { search: String(n) }, sameRevision);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('summarises the records for Profile', () => {
    const progress: Progress = { highestUnlocked: 5, completed: { 1: record(3, 1), 2: record(2, null), 3: record(null, null), 4: record(3, 4) } };
    expect(recordsSummary(progress, 30)).toEqual({ completed: 4, levels: 30, stars: 8, maxStars: 90, perfect: 2, timed: 2 });
    expect(recordsSummary(simulated(1000, 1000), 1000)).toMatchObject({ completed: 1000, perfect: 333, timed: 1000 });
  });
});

describe('saves and future levels', () => {
  it('existing saves load unchanged, and the same format holds records for 1,000 levels', () => {
    const store = new MemoryStore();
    const real = recordCompletion(createProgress(), 1, { moves: 5, stars: 3, mistakes: 0, timeMs: 9_000 }, LEVELS.length, LEVELS[0].revision ?? 1).progress;
    new ProgressStorage(LEVELS.length, store).save(real);
    expect(new ProgressStorage(LEVELS.length, store).load()).toEqual(real);

    const big = simulated(1000, 1000);
    new ProgressStorage(1000, store).save(big);
    const loaded = new ProgressStorage(1000, store).load();
    expect(Object.keys(loaded.completed)).toHaveLength(1000);
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).version).toBe(4); // no schema change
  });
});

describe('navigation', () => {
  it('records open from Profile and Back returns there', () => {
    const history = new NavigationHistory();
    history.go('profile');
    history.go('records');
    expect(history.backTarget).toBe('profile');
    expect(history.back()).toBe('profile');
  });
});
