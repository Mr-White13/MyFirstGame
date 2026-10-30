import { createProgress, type LevelRecord, type Progress } from './Progress';

/** The subset of the Web Storage API used here; lets tests pass an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'neon-escape.progress';
/** Bump when the saved shape changes; older or unknown versions start fresh. */
export const SAVE_VERSION = 1;

interface SaveFileV1 {
  version: typeof SAVE_VERSION;
  highestUnlocked: number;
  completed: Record<string, LevelRecord>;
}

export function serializeProgress(progress: Progress): string {
  const file: SaveFileV1 = {
    version: SAVE_VERSION,
    highestUnlocked: progress.highestUnlocked,
    completed: { ...progress.completed },
  };
  return JSON.stringify(file);
}

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * Turns whatever is in storage into valid progress. Never throws: missing,
 * malformed or outdated data falls back to a new game, and individual bad
 * entries are dropped while valid ones are kept.
 */
export function parseProgress(raw: string | null, levelCount: number): Progress {
  if (raw === null) return createProgress();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return createProgress();
  }
  if (typeof data !== 'object' || data === null) return createProgress();
  const file = data as Partial<Record<keyof SaveFileV1, unknown>>;
  if (file.version !== SAVE_VERSION) return createProgress();

  const completed: Record<number, LevelRecord> = {};
  if (typeof file.completed === 'object' && file.completed !== null) {
    for (const [key, record] of Object.entries(file.completed as Record<string, unknown>)) {
      const id = Number(key);
      if (!isPositiveInt(id) || id > levelCount) continue;
      const bestMoves = (record as { bestMoves?: unknown } | null)?.bestMoves;
      if (isPositiveInt(bestMoves)) completed[id] = { bestMoves };
    }
  }

  // Unlocks must be consistent with completions: every completed level unlocks
  // the next. This also extends progress when new levels are added later.
  const fromCompletions = Math.max(0, ...Object.keys(completed).map(Number)) + 1;
  const saved = isPositiveInt(file.highestUnlocked) ? file.highestUnlocked : 1;
  const highestUnlocked = Math.min(levelCount, Math.max(1, saved, fromCompletions));

  return { highestUnlocked, completed };
}

/** Browser localStorage, or null where it is unavailable (privacy modes, sandboxed frames). */
function browserStorage(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Loads and saves progress. Storage failures are swallowed: the game keeps working, just unsaved. */
export class ProgressStorage {
  constructor(
    private readonly levelCount: number,
    private readonly store: KeyValueStore | null = browserStorage(),
  ) {}

  load(): Progress {
    try {
      return parseProgress(this.store?.getItem(STORAGE_KEY) ?? null, this.levelCount);
    } catch {
      return createProgress();
    }
  }

  /** Returns false if the data could not be written (e.g. storage full or blocked). */
  save(progress: Progress): boolean {
    if (!this.store) return false;
    try {
      this.store.setItem(STORAGE_KEY, serializeProgress(progress));
      return true;
    } catch {
      return false;
    }
  }
}
