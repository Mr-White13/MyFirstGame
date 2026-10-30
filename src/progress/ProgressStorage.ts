import { createProgress, type LevelRecord, type Progress } from './Progress';

/** The subset of the Web Storage API used here; lets tests pass an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'neon-escape.progress';
/** Where unreadable or newer-version save data is copied before anything could replace it. */
export const BACKUP_KEY = 'neon-escape.progress.backup';

/**
 * Save format history:
 *  1 — { version, highestUnlocked, completed: { [id]: { bestMoves } } }
 *  2 — records also carry the level `revision` their best move count belongs to.
 * Older versions are migrated on load; the next save writes the current one.
 */
export const SAVE_VERSION = 2;

interface SaveFile {
  version: typeof SAVE_VERSION;
  highestUnlocked: number;
  completed: Record<string, LevelRecord>;
}

/** What loading found, so storage can protect data it doesn't understand. */
export type SaveStatus = 'empty' | 'current' | 'migrated' | 'corrupt' | 'newer';

export function serializeProgress(progress: Progress): string {
  const file: SaveFile = {
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
 * malformed or unknown data falls back to a new game, and individual bad
 * entries are dropped while valid ones are kept.
 */
export function readProgress(raw: string | null, levelCount: number): { progress: Progress; status: SaveStatus } {
  if (raw === null) return { progress: createProgress(), status: 'empty' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { progress: createProgress(), status: 'corrupt' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { progress: createProgress(), status: 'corrupt' };
  }
  const file = data as Partial<Record<keyof SaveFile, unknown>>;
  if (typeof file.version === 'number' && file.version > SAVE_VERSION) {
    // Written by a newer version of the game: don't guess at its meaning.
    return { progress: createProgress(), status: 'newer' };
  }
  if (file.version !== 1 && file.version !== 2) return { progress: createProgress(), status: 'corrupt' };

  const completed: Record<number, LevelRecord> = {};
  if (typeof file.completed === 'object' && file.completed !== null) {
    for (const [key, entry] of Object.entries(file.completed as Record<string, unknown>)) {
      const id = Number(key);
      if (!isPositiveInt(id) || id > levelCount) continue;
      const record = (entry ?? {}) as { bestMoves?: unknown; revision?: unknown };
      if (!isPositiveInt(record.bestMoves)) continue;
      // Version 1 saves predate level revisions: their records belong to revision 1.
      completed[id] = { bestMoves: record.bestMoves, revision: isPositiveInt(record.revision) ? record.revision : 1 };
    }
  }

  // Unlocks must be consistent with completions: every completed level unlocks
  // the next. This also extends progress when new levels are added later.
  const fromCompletions = Math.max(0, ...Object.keys(completed).map(Number)) + 1;
  const saved = isPositiveInt(file.highestUnlocked) ? file.highestUnlocked : 1;
  const highestUnlocked = Math.min(levelCount, Math.max(1, saved, fromCompletions));

  return { progress: { highestUnlocked, completed }, status: file.version === SAVE_VERSION ? 'current' : 'migrated' };
}

/** Convenience wrapper when only the progress is needed. */
export function parseProgress(raw: string | null, levelCount: number): Progress {
  return readProgress(raw, levelCount).progress;
}

/** Browser localStorage, or null where it is unavailable (privacy modes, sandboxed frames). */
function browserStorage(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Loads and saves progress. Storage failures are swallowed: the game keeps
 * working, just unsaved. Player data is never silently destroyed:
 * - unreadable data is copied to BACKUP_KEY before it can be replaced;
 * - data from a newer game version is backed up and never overwritten.
 */
export class ProgressStorage {
  private readOnly = false;

  constructor(
    private readonly levelCount: number,
    private readonly store: KeyValueStore | null = browserStorage(),
  ) {}

  load(): Progress {
    try {
      const raw = this.store?.getItem(STORAGE_KEY) ?? null;
      const { progress, status } = readProgress(raw, this.levelCount);
      if ((status === 'corrupt' || status === 'newer') && raw !== null) this.backup(raw);
      this.readOnly = status === 'newer';
      return progress;
    } catch {
      return createProgress();
    }
  }

  /** Returns false if the data was not written (storage blocked or full, or newer save protected). */
  save(progress: Progress): boolean {
    if (!this.store || this.readOnly) return false;
    try {
      this.store.setItem(STORAGE_KEY, serializeProgress(progress));
      return true;
    } catch {
      return false;
    }
  }

  private backup(raw: string): void {
    try {
      // Keep the first backup: a later load must not replace it with a worse copy.
      if (this.store && this.store.getItem(BACKUP_KEY) === null) this.store.setItem(BACKUP_KEY, raw);
    } catch {
      // Nothing more we can do without storage.
    }
  }
}
