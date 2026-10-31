import { isCompleted, isUnlocked, MAX_STARS, nextLevelToPlay, type Progress } from './Progress';
import { canPlayLevel } from './testUnlock';

/*
 * Chapters and personal records: how level select and the records view page
 * through any number of levels. Pure functions over saved progress (no DOM),
 * so they are testable with thousands of simulated levels. Every function
 * touches only the levels of one chapter or one result page, so the cost of
 * showing a page doesn't grow with the number of levels.
 */

/** Levels per chapter. */
export const CHAPTER_SIZE = 20;
/** Most rows a records search shows at once. */
export const RECORDS_PAGE_SIZE = CHAPTER_SIZE;

export function chapterCount(levelCount: number): number {
  return Math.max(1, Math.ceil(levelCount / CHAPTER_SIZE));
}

/** The chapter (1-based) a level belongs to. */
export function chapterOf(levelId: number): number {
  return Math.max(1, Math.ceil(levelId / CHAPTER_SIZE));
}

/** First and last level of a chapter (the last chapter may be shorter). */
export function chapterRange(chapter: number, levelCount: number): { first: number; last: number } {
  const c = clampChapter(chapter, levelCount);
  const first = (c - 1) * CHAPTER_SIZE + 1;
  return { first, last: Math.min(levelCount, first + CHAPTER_SIZE - 1) };
}

export function clampChapter(chapter: number, levelCount: number): number {
  return Math.min(chapterCount(levelCount), Math.max(1, Math.floor(chapter) || 1));
}

export interface ChapterSummary {
  readonly chapter: number;
  readonly first: number;
  readonly last: number;
  readonly levels: number;
  readonly completed: number;
  readonly stars: number;
  readonly maxStars: number;
  /** True if at least one level of the chapter can be played (really unlocked). */
  readonly unlocked: boolean;
}

export function chapterSummary(progress: Progress, chapter: number, levelCount: number): ChapterSummary {
  const c = clampChapter(chapter, levelCount);
  const { first, last } = chapterRange(c, levelCount);
  let completed = 0;
  let stars = 0;
  for (let id = first; id <= last; id++) {
    const record = progress.completed[id];
    if (!record) continue;
    completed++;
    stars += record.bestStars ?? 0;
  }
  const levels = last - first + 1;
  return { chapter: c, first, last, levels, completed, stars, maxStars: levels * MAX_STARS, unlocked: isUnlocked(progress, first) };
}

/** The state a level tile shows. `test`: really locked, open only because of the testing flag. */
export type TileState = 'completed' | 'current' | 'open' | 'test' | 'locked';

export interface LevelTile {
  readonly id: number;
  readonly state: TileState;
  /** Best stars, or null when not completed or unranked. */
  readonly bestStars: number | null;
}

/** The tiles of one chapter (never more than CHAPTER_SIZE). */
export function chapterTiles(progress: Progress, chapter: number, levelCount: number, unlockAll?: boolean): LevelTile[] {
  const { first, last } = chapterRange(chapter, levelCount);
  const next = nextLevelToPlay(progress, levelCount);
  const tiles: LevelTile[] = [];
  for (let id = first; id <= last; id++) {
    const completed = isCompleted(progress, id);
    const unlocked = isUnlocked(progress, id);
    const state: TileState = completed
      ? 'completed'
      : unlocked
        ? id === next
          ? 'current'
          : 'open'
        : canPlayLevel(progress, id, levelCount, unlockAll)
          ? 'test'
          : 'locked';
    tiles.push({ id, state, bestStars: completed ? (progress.completed[id].bestStars ?? null) : null });
  }
  return tiles;
}

/** The chapter that holds the level to play next ("jump to current"). */
export function currentChapter(progress: Progress, levelCount: number): number {
  return chapterOf(nextLevelToPlay(progress, levelCount));
}

// ---------------------------------------------------------------- records

export type RecordStatus = 'completed' | 'not completed' | 'locked';

export interface RecordEntry {
  readonly levelId: number;
  readonly status: RecordStatus;
  /** Best rating 1..3, or null (not completed, or completed before ratings / on an older layout and not replayed). */
  readonly bestStars: number | null;
  readonly bestTimeMs: number | null;
  /** The record was set on an earlier layout of this level (kept, but not comparable with the current one). */
  readonly olderLayout: boolean;
}

/**
 * One level's record, straight from the save. Levels with no saved record
 * show as not completed (or locked): nothing is ever made up, and levels
 * added in future simply have no record until they are played.
 */
export function recordEntry(progress: Progress, levelId: number, revisionOf: (id: number) => number): RecordEntry {
  const record = progress.completed[levelId];
  if (!record) return { levelId, status: isUnlocked(progress, levelId) ? 'not completed' : 'locked', bestStars: null, bestTimeMs: null, olderLayout: false };
  return { levelId, status: 'completed', bestStars: record.bestStars, bestTimeMs: record.bestTimeMs, olderLayout: record.revision !== revisionOf(levelId) };
}

export type RecordsQuery = { readonly chapter: number } | { readonly search: string };

export interface RecordsPage {
  readonly entries: readonly RecordEntry[];
  /** The chapter shown, or null for search results. */
  readonly chapter: number | null;
  /** Levels matching a search, before the page limit (the chapter size for a chapter). */
  readonly matches: number;
}

/**
 * The rows to show: one chapter, or the levels whose number starts with the
 * searched digits ("7" → 7, 70–79, 700–799 …), at most RECORDS_PAGE_SIZE,
 * an exact match first. Only those rows are built.
 */
export function queryRecords(progress: Progress, levelCount: number, query: RecordsQuery, revisionOf: (id: number) => number): RecordsPage {
  if ('chapter' in query) {
    const { first, last } = chapterRange(query.chapter, levelCount);
    const entries: RecordEntry[] = [];
    for (let id = first; id <= last; id++) entries.push(recordEntry(progress, id, revisionOf));
    return { entries, chapter: clampChapter(query.chapter, levelCount), matches: entries.length };
  }
  const ids = searchLevelIds(query.search, levelCount);
  return { entries: ids.ids.map((id) => recordEntry(progress, id, revisionOf)), chapter: null, matches: ids.matches };
}

/** Level ids matching typed digits, by number prefix, smallest first; at most RECORDS_PAGE_SIZE. */
export function searchLevelIds(search: string, levelCount: number): { ids: number[]; matches: number } {
  const digits = search.trim().replace(/^0+/, '');
  if (!/^\d+$/.test(digits)) return { ids: [], matches: 0 };
  const ids: number[] = [];
  let matches = 0;
  // Numbers starting with `digits`: digits itself, then each wider band (×10 … ×10+9, ×100 … ×100+99, …).
  for (let low = Number(digits), width = 1; low <= levelCount; low *= 10, width *= 10) {
    const high = Math.min(levelCount, low + width - 1);
    matches += high - low + 1;
    for (let id = low; id <= high && ids.length < RECORDS_PAGE_SIZE; id++) ids.push(id);
  }
  return { ids, matches };
}

export interface RecordsSummary {
  readonly completed: number;
  readonly levels: number;
  readonly stars: number;
  readonly maxStars: number;
  readonly perfect: number;
  /** Completed levels with a timed best. */
  readonly timed: number;
}

/** The compact summary on Profile: counted from the saved records only. */
export function recordsSummary(progress: Progress, levelCount: number): RecordsSummary {
  let completed = 0;
  let stars = 0;
  let perfect = 0;
  let timed = 0;
  for (const [key, record] of Object.entries(progress.completed)) {
    const id = Number(key);
    if (!(id >= 1 && id <= levelCount)) continue;
    completed++;
    stars += record.bestStars ?? 0;
    if (record.bestStars === MAX_STARS) perfect++;
    if (record.bestTimeMs != null) timed++;
  }
  return { completed, levels: levelCount, stars, maxStars: levelCount * MAX_STARS, perfect, timed };
}
