import {
  browserStorage,
  isNonNegativeInt,
  isNonNegativeNumber,
  isPositiveInt,
  SafeStore,
  type KeyValueStore,
  type SaveStatus,
} from '../storage/SafeStore';
import { createProgress, MAX_STARS, type LevelRecord, type Progress } from './Progress';

export type { KeyValueStore, SaveStatus } from '../storage/SafeStore';

export const STORAGE_KEY = 'neon-escape.progress';
/** Where unreadable or newer-version save data is copied before anything could replace it. */
export const BACKUP_KEY = 'neon-escape.progress.backup';

/**
 * Save format history:
 *  1 — { version, highestUnlocked, completed: { [id]: { bestMoves } } }
 *  2 — records also carry the level `revision` their best move count belongs to.
 *  3 — records also carry `bestStars` (1..3 or null = unranked) and `bestMistakes`.
 *  4 — records also carry `bestTimeMs` (fastest completion, or null if none timed).
 * Older versions are migrated on load; the next save writes the current one.
 * Completions from versions 1–2 predate lives and stars: they stay completed
 * (and keep their unlocks) but are unranked until replayed. Completions from
 * versions 1–3 predate the timer: their best time is null until replayed.
 */
export const SAVE_VERSION = 4;

interface SaveFile {
  version: typeof SAVE_VERSION;
  highestUnlocked: number;
  completed: Record<string, LevelRecord>;
}

export function serializeProgress(progress: Progress): string {
  const file: SaveFile = {
    version: SAVE_VERSION,
    highestUnlocked: progress.highestUnlocked,
    completed: { ...progress.completed },
  };
  return JSON.stringify(file);
}

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
  if (file.version !== 1 && file.version !== 2 && file.version !== 3 && file.version !== 4) {
    return { progress: createProgress(), status: 'corrupt' };
  }

  const completed: Record<number, LevelRecord> = {};
  if (typeof file.completed === 'object' && file.completed !== null) {
    for (const [key, entry] of Object.entries(file.completed as Record<string, unknown>)) {
      const id = Number(key);
      if (!isPositiveInt(id) || id > levelCount) continue;
      const record = (entry ?? {}) as {
        bestMoves?: unknown;
        revision?: unknown;
        bestStars?: unknown;
        bestMistakes?: unknown;
        bestTimeMs?: unknown;
      };
      if (!isPositiveInt(record.bestMoves)) continue;
      // Older saves predate stars (and version 1 predates revisions). Missing or
      // malformed ratings are treated as unranked rather than guessed.
      const bestStars = isPositiveInt(record.bestStars) && record.bestStars <= MAX_STARS ? record.bestStars : null;
      const bestMistakes = bestStars !== null && isNonNegativeInt(record.bestMistakes) ? record.bestMistakes : null;
      // Times only exist from version 4 on; anything missing or malformed means "not timed yet".
      const bestTimeMs = isNonNegativeNumber(record.bestTimeMs) && record.bestTimeMs > 0 ? record.bestTimeMs : null;
      completed[id] = {
        bestMoves: record.bestMoves,
        revision: isPositiveInt(record.revision) ? record.revision : 1,
        bestStars,
        bestMistakes,
        bestTimeMs,
      };
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

/**
 * Loads and saves progress. All the safety rules (failures swallowed,
 * backups of unreadable data, newer saves never overwritten) live in SafeStore.
 */
export class ProgressStorage {
  private readonly safe: SafeStore<Progress>;

  constructor(levelCount: number, store: KeyValueStore | null = browserStorage()) {
    this.safe = new SafeStore(
      STORAGE_KEY,
      {
        read: (raw) => {
          const { progress, status } = readProgress(raw, levelCount);
          return { value: progress, status };
        },
        write: serializeProgress,
        fallback: createProgress,
      },
      store,
    );
  }

  load(): Progress {
    return this.safe.load();
  }

  /** Returns false if the data was not written (storage blocked or full, or newer save protected). */
  save(progress: Progress): boolean {
    return this.safe.save(progress);
  }
}
